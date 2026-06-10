import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { DocumentTypeSchema, EntityTypeSchema } from '../../runtime/zod-schemas';
import { readAuthProps } from '../../runtime/key-mapping';
import { circuitBreaker } from '../../runtime/circuit-breaker';
import { rateLimiter } from '../../runtime/rate-limiter';
import { documentIntelExtract } from '../../runtime/providers/document-intel';
import {
  resolveEffectiveConfig,
  readConnectionConfigOverrides,
} from '../../runtime/effective-config';
import { advancedProp, readStepAdvanced } from '../common/advanced-prop';
import { documentPipeline, WORKFLOW_ID_BY_DOCTYPE } from '../../runtime/document-pipeline';

export const extractDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'extract_document',
  displayName: 'Extract Document',
  description:
    'Extract Alvys-shaped structured data from a transportation document. Document type drives the schema; tenant custom-references are merged into the result.',
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
          { label: 'Other (generic schema)', value: 'other' },
        ],
      },
    }),
    entityType: Property.StaticDropdown<string>({
      displayName: 'Linked Entity Type',
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
    customReferences: Property.Json({
      displayName: 'Custom References',
      description:
        'Tenant-specific reference fields to extract alongside the canonical schema. Shape: { fieldName: "human description" }.',
      required: false,
      defaultValue: {},
    }),
    advanced: advancedProp,
  },
  async run(context) {
    const auth = readAuthProps(context.auth);
    if (!auth.documentKey) {
      throw new Error('Document Intelligence Key is not configured on the Alvys Intelligence connection.');
    }
    if (!auth.documentBaseUrl?.trim()) {
      throw new Error(
        'Document Intelligence Endpoint is not configured on the Alvys Intelligence connection. Set the endpoint URL on the connection.',
      );
    }

    const dtResult = DocumentTypeSchema.safeParse(context.propsValue.documentType);
    if (!dtResult.success) throw new Error('Invalid Document Type.');
    const etResult = EntityTypeSchema.safeParse(context.propsValue.entityType);
    if (!etResult.success) throw new Error('Invalid Linked Entity Type.');

    const config = await resolveEffectiveConfig({
      store: context.store,
      apiUrl: context.server.apiUrl,
      serverToken: context.server.token,
      connectionConfig: readConnectionConfigOverrides(context.auth),
      stepConfig: readStepAdvanced(context.propsValue.advanced),
    });

    const tenantKey = context.project.id;
    const rl = await rateLimiter.checkAndIncrement({
      store: context.store,
      storeKey: `alvys.intelligence.${tenantKey}.rl.extract`,
      config: { maxRequests: config.rateLimitMaxRequests, windowMs: config.rateLimitWindowSec * 1000 },
    });
    if (!rl.allowed) {
      throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
    }

    const breakerKey = `alvys.intelligence.${tenantKey}.cb.document`;
    const breakerCheck = await circuitBreaker.checkAllowed({
      store: context.store,
      storeKey: breakerKey,
      config: { failureThreshold: config.circuitFailureThreshold, recoveryWindowMs: config.circuitRecoveryWindowSec * 1000 },
    });
    if (!breakerCheck.allowed) {
      throw new Error('Document extraction is temporarily unavailable. Retry shortly.');
    }

    const baseUrl = config.documentBaseUrl?.trim() || auth.documentBaseUrl;
    const workflowId = documentPipeline.workflowIdFor(dtResult.data);
    if (!workflowId) {
      throw new Error('No extraction pipeline is configured for the selected document type.');
    }

    const file = context.propsValue.file;
    try {
      const result = await documentIntelExtract({
        apiKey: auth.documentKey,
        baseUrl,
        workflowId,
        fileBase64: file.base64,
        fileName: file.filename,
        mimeType: 'application/octet-stream',
      });
      await circuitBreaker.recordSuccess({ store: context.store, storeKey: breakerKey });

      const customRefs = (context.propsValue.customReferences ?? {}) as Record<string, unknown>;
      const merged = documentPipeline.mergeWithCustomReferences({
        fields: result.fields,
        customReferenceSchema: customRefs,
      });

      return {
        documentType: dtResult.data,
        entityType: etResult.data,
        entityId: context.propsValue.entityId ?? null,
        status: result.status,
        confidence: result.confidence ?? null,
        data: merged.canonical,
        customReferences: merged.customReferences,
        rateLimit: { remaining: rl.remaining, total: rl.total },
        effectiveConfigSummary: {
          rateLimitMaxRequests: config.rateLimitMaxRequests,
          circuitFailureThreshold: config.circuitFailureThreshold,
          documentTimeoutMs: config.documentTimeoutMs,
        },
      };
    } catch (err) {
      await circuitBreaker.recordFailure({
        store: context.store,
        storeKey: breakerKey,
        config: { failureThreshold: config.circuitFailureThreshold, recoveryWindowMs: config.circuitRecoveryWindowSec * 1000 },
      });
      throw err;
    }
  },
});

export { WORKFLOW_ID_BY_DOCTYPE };
