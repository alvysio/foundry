import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import {
  DocumentTypeSchema,
  EntityTypeSchema,
} from '../../runtime/zod-schemas';
import { readAuthProps } from '../../runtime/key-mapping';
import { circuitBreaker } from '../../runtime/circuit-breaker';
import { rateLimiter } from '../../runtime/rate-limiter';
import { bemExtract } from '../../runtime/providers/bem';

const DEFAULT_BASE_URL_BY_ENV: Record<string, string> = {
  production: 'https://api.bem.ai/v1',
  qa: 'https://api.bem.ai/v1',
};

const WORKFLOW_ID_BY_DOCTYPE: Record<string, string> = {
  pod: 'alvys-pod-extract-v1',
  ratecon: 'alvys-ratecon-extract-v1',
  bol: 'alvys-bol-extract-v1',
  customer_invoice: 'alvys-customer-invoice-extract-v1',
  carrier_invoice: 'alvys-carrier-invoice-extract-v1',
  coi: 'alvys-coi-extract-v1',
  mvr: 'alvys-mvr-extract-v1',
  dac: 'alvys-dac-extract-v1',
  ifta: 'alvys-ifta-extract-v1',
  lumper_receipt: 'alvys-lumper-extract-v1',
  scale_ticket: 'alvys-scale-extract-v1',
  accessorial_receipt: 'alvys-accessorial-extract-v1',
  edi_204_image: 'alvys-edi204-extract-v1',
  other: 'alvys-generic-extract-v1',
};

export const extractDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'extractDocument',
  displayName: 'Extract Document',
  description:
    'Extract structured data from a transportation document. The piece selects the right extraction workflow for the document type and tags the result with the linked entity context. All processing happens inside the Activepieces sandbox.',
  props: {
    documentType: Property.StaticDropdown<string>({
      displayName: 'Document Type',
      required: true,
      options: {
        options: [
          { label: 'POD (Proof of Delivery)', value: 'pod' },
          { label: 'Rate Confirmation', value: 'ratecon' },
          { label: 'BOL (Bill of Lading)', value: 'bol' },
          { label: 'Customer Invoice', value: 'customer_invoice' },
          { label: 'Carrier Invoice', value: 'carrier_invoice' },
          { label: 'Certificate of Insurance (COI)', value: 'coi' },
          { label: 'Motor Vehicle Record (MVR)', value: 'mvr' },
          { label: 'DAC Report', value: 'dac' },
          { label: 'IFTA Report', value: 'ifta' },
          { label: 'Lumper Receipt', value: 'lumper_receipt' },
          { label: 'Scale Ticket', value: 'scale_ticket' },
          { label: 'Accessorial Receipt', value: 'accessorial_receipt' },
          { label: 'EDI 204 Tender (image)', value: 'edi_204_image' },
          { label: 'Other (uses generic schema)', value: 'other' },
        ],
      },
    }),
    entityType: Property.StaticDropdown<string>({
      displayName: 'Linked Entity Type',
      description:
        'The piece tags the extraction result with the linked entity type so downstream steps know what to do with the fields.',
      required: true,
      options: {
        options: [
          { label: 'Load', value: 'load' },
          { label: 'Trip', value: 'trip' },
          { label: 'Driver', value: 'driver' },
          { label: 'Truck', value: 'truck' },
          { label: 'Trailer', value: 'trailer' },
          { label: 'Carrier', value: 'carrier' },
          { label: 'Customer', value: 'customer' },
          { label: 'Maintenance Order', value: 'maintenance_order' },
          { label: 'Invoice', value: 'invoice' },
          { label: 'None / Standalone', value: 'none' },
        ],
      },
    }),
    entityId: Property.ShortText({
      displayName: 'Linked Entity Id',
      description: 'Business id for the linked entity (e.g. load number, driver id). Optional.',
      required: false,
    }),
    file: Property.File({
      displayName: 'Document',
      description: 'PDF, PNG, JPG, or TIFF. Max 25 MB.',
      required: true,
    }),
  },
  async run(context) {
    const auth = readAuthProps(context.auth);
    if (!auth.documentKey) {
      throw new Error('Document Intelligence Key is not configured on the Alvys Intelligence connection.');
    }

    const dtResult = DocumentTypeSchema.safeParse(context.propsValue.documentType);
    if (!dtResult.success) throw new Error('Invalid Document Type.');
    const etResult = EntityTypeSchema.safeParse(context.propsValue.entityType);
    if (!etResult.success) throw new Error('Invalid Linked Entity Type.');

    const tenantKey = context.project.id;
    const rl = await rateLimiter.checkAndIncrement({
      store: context.store,
      storeKey: `alvys.intelligence.${tenantKey}.rl.extract`,
    });
    if (!rl.allowed) {
      throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
    }

    const breakerKey = `alvys.intelligence.${tenantKey}.cb.document`;
    const breakerCheck = await circuitBreaker.checkAllowed({
      store: context.store,
      storeKey: breakerKey,
    });
    if (!breakerCheck.allowed) {
      throw new Error('Document extraction is temporarily unavailable. Retry shortly.');
    }

    const baseUrl =
      auth.documentBaseUrl?.trim() ||
      DEFAULT_BASE_URL_BY_ENV[auth.environment] ||
      DEFAULT_BASE_URL_BY_ENV['production'];
    const workflowId = WORKFLOW_ID_BY_DOCTYPE[dtResult.data];
    if (!workflowId) {
      throw new Error('No extraction workflow is configured for the selected document type.');
    }

    const file = context.propsValue.file;
    try {
      const result = await bemExtract({
        apiKey: auth.documentKey,
        baseUrl,
        workflowId,
        fileBase64: file.base64,
        fileName: file.filename,
        mimeType: 'application/octet-stream',
      });
      await circuitBreaker.recordSuccess({
        store: context.store,
        storeKey: breakerKey,
      });
      return {
        documentType: dtResult.data,
        entityType: etResult.data,
        entityId: context.propsValue.entityId ?? null,
        status: result.status,
        confidence: result.confidence ?? null,
        fields: result.fields,
        rateLimit: { remaining: rl.remaining, total: rl.total },
      };
    } catch (err) {
      await circuitBreaker.recordFailure({
        store: context.store,
        storeKey: breakerKey,
      });
      throw err;
    }
  },
});
