import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';

const SUPPORTED_TYPES: { label: string; value: string }[] = [
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
];

export const classifyDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'classify_document',
  displayName: 'Classify Document',
  description:
    'Detect the document type (POD, rate confirmation, BOL, invoice, etc.) for a single file. Use the output to route to a typed Extract Document step.',
  props: {
    file: Property.File({
      displayName: 'Document',
      description: 'PDF, PNG, JPG, or TIFF. Max 25 MB.',
      required: true,
    }),
    allowedTypes: Property.StaticMultiSelectDropdown<string>({
      displayName: 'Allowed Types (Optional)',
      description: 'Restrict classification to a subset of document types.',
      required: false,
      options: { options: SUPPORTED_TYPES },
    }),
    minConfidence: Property.Number({
      displayName: 'Minimum Confidence',
      description:
        'Below this threshold, detected type is reported as "unknown". Only applied when the classifier returns a confidence score.',
      required: false,
      defaultValue: 0.6,
    }),
    callReferenceId: Property.ShortText({
      displayName: 'Call Reference Id',
      description: 'Optional idempotency / tracking id forwarded to the document-intelligence pipeline.',
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
    const call = await documentCall.begin({
      rawAuth: context.auth,
      store: context.store,
      apiUrl: context.server.apiUrl,
      serverToken: context.server.token,
      projectId: context.project.id,
      advanced: context.propsValue.advanced,
      rateKeySuffix: 'classify',
      unavailableMessage: 'Document classification is temporarily unavailable. Retry shortly.',
    });

    const workflowName = await documentCall.resolveWorkflowName({
      flows: context.flows,
      stepName: context.step.name,
      store: context.store,
      primitive: 'classify',
      override: context.propsValue.workflowName,
    });
    const file = context.propsValue.file;
    const allowed = context.propsValue.allowedTypes;
    const minConfidence = context.propsValue.minConfidence ?? 0.6;

    try {
      await bemProvider.ensureDocumentWorkflow({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        workflowName,
        primitive: 'classify',
        displayName: `Alvys Classify — ${context.step.name}`,
        classifications: SUPPORTED_TYPES.map((t) => ({
          name: t.value,
          description: `Transportation document: ${t.label}.`,
        })),
      });
      const result = await bemProvider.callWorkflowAndAwait({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        workflowName,
        callReferenceId: context.propsValue.callReferenceId?.trim() || undefined,
        fileBase64: file.base64,
        fileName: file.filename,
        timeoutMs: call.config.documentTimeoutMs,
      });
      await call.recordSuccess();

      const { choice, confidence: rawConfidence } = bemProvider.readClassifyOutput(result);
      const confidence = rawConfidence ?? null;

      let detectedType = choice ?? 'unknown';
      if (allowed && allowed.length > 0 && !allowed.includes(detectedType)) {
        detectedType = 'unknown';
      }
      if (confidence !== null && confidence < minConfidence) {
        detectedType = 'unknown';
      }

      return {
        detectedType,
        choice: choice ?? null,
        confidence,
        status: result.status,
        callId: result.callID,
        workflowName,
        rateLimit: call.rateLimit,
      };
    } catch (err) {
      await call.recordFailure();
      throw err;
    }
  },
});

export const ROUTABLE_DOCUMENT_TYPES = SUPPORTED_TYPES;
