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

/**
 * Convenience action: classify + return a routing key suitable for an AP Router
 * branch. Equivalent to chaining classify_document → derive routeKey, but
 * avoids the extra step in flow builders. The output is intentionally narrow
 * so flow authors can drop the action into a Router without an intermediate
 * mapping step.
 */
export const routeDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'route_document',
  displayName: 'Route Document',
  description:
    'Classify a document and return a routing key. Pair with an AP Router to branch by document type.',
  props: {
    file: Property.File({
      displayName: 'Document',
      required: true,
    }),
    fallback: Property.ShortText({
      displayName: 'Fallback Route Key',
      description:
        'Returned when classification confidence is below the minimum or the type is not in the allowed set.',
      required: false,
      defaultValue: 'other',
    }),
    minConfidence: Property.Number({
      displayName: 'Minimum Confidence',
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

    const fallback = (context.propsValue.fallback ?? 'other').trim() || 'other';
    const minConfidence = context.propsValue.minConfidence ?? 0.6;
    const file = context.propsValue.file;
    const baseUrl = config.documentBaseUrl?.trim() || auth.documentBaseUrl;

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

      const fields = raw.fields as { detectedType?: string; documentType?: string; confidence?: number };
      const detectedType = fields.detectedType ?? fields.documentType ?? fallback;
      const confidence = typeof fields.confidence === 'number' ? fields.confidence : raw.confidence ?? 0;
      const routeKey = confidence >= minConfidence ? detectedType : fallback;

      return {
        routeKey,
        detectedType,
        confidence,
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
