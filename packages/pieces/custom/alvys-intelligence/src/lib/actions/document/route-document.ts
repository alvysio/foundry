import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';
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
        'Returned when classification confidence is below the minimum or the classifier routes to its error-fallback classification.',
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

    const fallback = (context.propsValue.fallback ?? 'other').trim() || 'other';
    const minConfidence = context.propsValue.minConfidence ?? 0.6;
    const file = context.propsValue.file;

    try {
      const result = await bemProvider.callWorkflowAndAwait({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        workflowName: documentPipeline.classificationWorkflowId(),
        fileBase64: file.base64,
        fileName: file.filename,
        timeoutMs: call.config.documentTimeoutMs,
      });
      await call.recordSuccess();

      const { choice, output } = bemProvider.readClassifyOutput(result);
      const confidence = output?.confidence ?? null;
      const detectedType = choice ?? fallback;
      const routeKey = confidence === null || confidence >= minConfidence ? detectedType : fallback;

      return {
        routeKey,
        detectedType,
        confidence,
        callId: result.callID,
        rateLimit: call.rateLimit,
      };
    } catch (err) {
      await call.recordFailure();
      throw err;
    }
  },
});
