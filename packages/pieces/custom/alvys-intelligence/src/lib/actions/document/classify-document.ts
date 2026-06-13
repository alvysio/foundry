import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';
import { documentPipeline } from '../../runtime/document-pipeline';

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

/**
 * Classify a transportation document into a single category. The `category`
 * output is a stable slug meant to drive a downstream Router — add one branch
 * per document type whose condition matches `category`, then place a typed
 * Extract Document step inside each branch. Below the confidence threshold (or
 * outside the allowed set), `category` is `unknown` so a Router fallback branch
 * catches it.
 */
export const classifyDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'classify_document',
  displayName: 'Classify Document',
  description:
    'Detect the document type (POD, rate confirmation, BOL, invoice, etc.) for a single file. Pair with a Router to branch by category and route each type into its own Extract Document step.',
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
        'Below this threshold, `category` is reported as "unknown". Only applied when the classifier returns a confidence score.',
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
      const result = await documentCall.callDocumentWorkflow({
        store: context.store,
        ensure: {
          apiKey: call.apiKey,
          baseUrl: call.baseUrl,
          workflowName,
          primitive: 'classify',
          displayName: `Alvys Classify — ${context.step.name}`,
          classifications: [...documentPipeline.classificationCriteria()],
        },
        call: {
          apiKey: call.apiKey,
          baseUrl: call.baseUrl,
          workflowName,
          callReferenceId: context.propsValue.callReferenceId?.trim() || undefined,
          fileBase64: file.base64,
          fileName: file.filename,
          timeoutMs: call.config.documentTimeoutMs,
        },
      });
      await call.recordSuccess();

      const { choice, confidence: rawConfidence } = bemProvider.readClassifyOutput(result);
      const confidence = rawConfidence ?? null;

      let category = choice ?? 'unknown';
      let fallbackReason: string | null = null;
      if (allowed && allowed.length > 0 && !allowed.includes(category)) {
        category = 'unknown';
        fallbackReason = 'not_in_allowed_types';
      }
      if (confidence !== null && confidence < minConfidence) {
        category = 'unknown';
        fallbackReason = 'below_min_confidence';
      }

      return {
        category,
        detectedType: choice ?? null,
        confidence,
        fallbackUsed: category === 'unknown',
        fallbackReason,
        supportedCategories: SUPPORTED_TYPES,
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
