import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { readAuthProps } from '../../runtime/key-mapping';
import { circuitBreaker } from '../../runtime/circuit-breaker';
import { rateLimiter } from '../../runtime/rate-limiter';
import { documentIntelExtract } from '../../runtime/providers/document-intel';
import {
  resolveEffectiveConfig,
  readConnectionConfigOverrides,
} from '../../runtime/effective-config';
import { advancedProp, readStepAdvanced } from '../common/advanced-prop';
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

type ClassifyResponse = {
  detectedType?: string;
  documentType?: string;
  type?: string;
  confidence?: number;
  candidates?: Array<{ type: string; score: number }>;
  pageCount?: number;
};

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
    hint: Property.ShortText({
      displayName: 'Context Hint (Optional)',
      description:
        'Optional free-form hint that helps the classifier (e.g. "from carrier billing email").',
      required: false,
    }),
    allowedTypes: Property.StaticMultiSelectDropdown<string>({
      displayName: 'Allowed Types (Optional)',
      description: 'Restrict classification to a subset of document types.',
      required: false,
      options: { options: SUPPORTED_TYPES },
    }),
    minConfidence: Property.Number({
      displayName: 'Minimum Confidence',
      description: 'Below this threshold, detected type is reported as "unknown".',
      required: false,
      defaultValue: 0.6,
    }),
    advanced: advancedProp,
  },
  async run(context) {
    const auth = readAuthProps(context.auth);
    if (!auth.documentKey) {
      throw new Error('Document Intelligence Key is not configured on the Alvys Intelligence connection.');
    }
    if (!auth.documentBaseUrl?.trim()) {
      throw new Error('Document Intelligence Endpoint is not configured on the Alvys Intelligence connection.');
    }

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
      storeKey: `alvys.intelligence.${tenantKey}.rl.classify`,
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
      throw new Error('Document classification is temporarily unavailable. Retry shortly.');
    }

    const baseUrl = config.documentBaseUrl?.trim() || auth.documentBaseUrl;
    const file = context.propsValue.file;
    const allowed = context.propsValue.allowedTypes;
    const minConfidence = context.propsValue.minConfidence ?? 0.6;
    const hint = context.propsValue.hint?.trim();

    try {
      const raw = await documentIntelExtract({
        apiKey: auth.documentKey,
        baseUrl,
        workflowId: documentPipeline.classificationWorkflowId(),
        fileBase64: file.base64,
        fileName: file.filename,
        mimeType: 'application/octet-stream',
      });
      await circuitBreaker.recordSuccess({ store: context.store, storeKey: breakerKey });

      const fields = raw.fields as ClassifyResponse;
      const candidateType =
        fields.detectedType ?? fields.documentType ?? fields.type ?? 'unknown';
      const confidence = typeof fields.confidence === 'number' ? fields.confidence : raw.confidence ?? 0;

      const filteredCandidates = (fields.candidates ?? []).filter((c) =>
        allowed && allowed.length > 0 ? allowed.includes(c.type) : true,
      );

      let detectedType = candidateType;
      if (allowed && allowed.length > 0 && !allowed.includes(detectedType)) {
        detectedType = 'unknown';
      }
      if (confidence < minConfidence) {
        detectedType = 'unknown';
      }

      return {
        detectedType,
        confidence,
        candidates: filteredCandidates,
        pageCount: fields.pageCount ?? null,
        hintApplied: hint ?? null,
        rateLimit: { remaining: rl.remaining, total: rl.total },
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
