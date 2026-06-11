import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { DocumentTypeSchema, EntityTypeSchema } from '../../runtime/zod-schemas';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';
import { documentPipeline } from '../../runtime/document-pipeline';

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
    callReferenceId: Property.ShortText({
      displayName: 'Call Reference Id',
      description:
        'Optional idempotency / tracking id forwarded to the document-intelligence pipeline. Defaults to a value derived from the linked entity.',
      required: false,
    }),
    workflowName: Property.ShortText({
      displayName: 'Workflow Override',
      description:
        'Optional document-workflow name. Leave blank to use the workflow provisioned automatically for this flow and step.',
      required: false,
    }),
    advanced: advancedProp,
  },
  async run(context) {
    const dtResult = DocumentTypeSchema.safeParse(context.propsValue.documentType);
    if (!dtResult.success) throw new Error('Invalid Document Type.');
    const etResult = EntityTypeSchema.safeParse(context.propsValue.entityType);
    if (!etResult.success) throw new Error('Invalid Linked Entity Type.');

    const call = await documentCall.begin({
      rawAuth: context.auth,
      store: context.store,
      apiUrl: context.server.apiUrl,
      serverToken: context.server.token,
      projectId: context.project.id,
      advanced: context.propsValue.advanced,
      rateKeySuffix: 'extract',
      unavailableMessage: 'Document extraction is temporarily unavailable. Retry shortly.',
    });

    const workflowName = await documentCall.resolveWorkflowName({
      flows: context.flows,
      stepName: context.step.name,
      store: context.store,
      primitive: 'extract',
      override: context.propsValue.workflowName,
    });

    const file = context.propsValue.file;
    const customRefs = (context.propsValue.customReferences ?? {}) as Record<string, unknown>;
    const callReferenceId =
      context.propsValue.callReferenceId?.trim() ||
      [etResult.data, context.propsValue.entityId, dtResult.data].filter(Boolean).join('-') ||
      undefined;

    const customRefProperties: Record<string, { type: string; description: string }> = {};
    for (const [field, description] of Object.entries(customRefs)) {
      customRefProperties[field] = { type: 'string', description: String(description ?? field) };
    }

    try {
      const result = await documentCall.callDocumentWorkflow({
        store: context.store,
        ensure: {
          apiKey: call.apiKey,
          baseUrl: call.baseUrl,
          workflowName,
          primitive: 'extract',
          displayName: `Alvys Extract — ${context.step.name}`,
          extractDescription: `Structured data extracted from a transportation document of type "${dtResult.data}".`,
          extractSchemaProperties: {
            ...documentPipeline.canonicalFieldsFor(dtResult.data),
            ...customRefProperties,
          },
        },
        call: {
          apiKey: call.apiKey,
          baseUrl: call.baseUrl,
          workflowName,
          callReferenceId,
          fileBase64: file.base64,
          fileName: file.filename,
          timeoutMs: call.config.documentTimeoutMs,
        },
      });
      await call.recordSuccess();

      const { content, confidence } = bemProvider.readExtractOutput(result);
      const merged = documentPipeline.mergeWithCustomReferences({
        fields: content,
        customReferenceSchema: customRefs,
      });

      return {
        documentType: dtResult.data,
        entityType: etResult.data,
        entityId: context.propsValue.entityId ?? null,
        status: result.status,
        callId: result.callID,
        callReferenceId: callReferenceId ?? null,
        workflowName,
        confidence: confidence ?? null,
        data: merged.canonical,
        customReferences: merged.customReferences,
        rateLimit: call.rateLimit,
        effectiveConfigSummary: {
          rateLimitMaxRequests: call.config.rateLimitMaxRequests,
          circuitFailureThreshold: call.config.circuitFailureThreshold,
          documentTimeoutMs: call.config.documentTimeoutMs,
        },
      };
    } catch (err) {
      await call.recordFailure();
      throw err;
    }
  },
});
