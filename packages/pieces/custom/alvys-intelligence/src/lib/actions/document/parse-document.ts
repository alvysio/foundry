import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';

export const parseDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'parse_document',
  displayName: 'Parse Document',
  description:
    'Parse a document into page-aware sections, named entities, and relationships. The parsed output is stored under the Call Reference Id and can be queried with the Search Parsed Documents action.',
  props: {
    file: Property.File({
      displayName: 'Document',
      description: 'PDF, PNG, JPG, TIFF, or spreadsheet. Max 25 MB.',
      required: true,
    }),
    callReferenceId: Property.ShortText({
      displayName: 'Call Reference Id',
      description:
        'Identifier for the parsed document — used as the `path` for Search Parsed Documents queries (ls / cat / grep / find / xref).',
      required: true,
    }),
    fetchParsedContent: Property.Checkbox({
      displayName: 'Fetch Parsed Content',
      description:
        'After parsing completes, read the parsed document back and include it in the output.',
      required: false,
      defaultValue: true,
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
    const callReferenceId = context.propsValue.callReferenceId.trim();
    if (!callReferenceId) {
      throw new Error('Call Reference Id must not be blank.');
    }

    const call = await documentCall.begin({
      rawAuth: context.auth,
      store: context.store,
      apiUrl: context.server.apiUrl,
      serverToken: context.server.token,
      projectId: context.project.id,
      advanced: context.propsValue.advanced,
      rateKeySuffix: 'parse',
      unavailableMessage: 'Document parsing is temporarily unavailable. Retry shortly.',
    });

    const workflowName = await documentCall.resolveWorkflowName({
      flows: context.flows,
      stepName: context.step.name,
      store: context.store,
      primitive: 'parse',
      override: context.propsValue.workflowName,
    });
    const file = context.propsValue.file;

    try {
      await bemProvider.ensureDocumentWorkflow({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        workflowName,
        primitive: 'parse',
        displayName: `Alvys Parse — ${context.step.name}`,
      });
      const result = await bemProvider.callWorkflowAndAwait({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        workflowName,
        callReferenceId,
        fileBase64: file.base64,
        fileName: file.filename,
        timeoutMs: call.config.documentTimeoutMs,
      });

      let parsedContent: Record<string, unknown> | null = bemProvider.readParseOutput(result).content;
      if (!parsedContent && context.propsValue.fetchParsedContent) {
        parsedContent = await bemProvider.fsQuery({
          apiKey: call.apiKey,
          baseUrl: call.baseUrl,
          body: { op: 'cat', path: callReferenceId },
        });
      }
      await call.recordSuccess();

      return {
        status: result.status,
        callId: result.callID,
        callReferenceId,
        workflowName,
        fileSystemPath: callReferenceId,
        parsedContent,
        rateLimit: call.rateLimit,
      };
    } catch (err) {
      await call.recordFailure();
      throw err;
    }
  },
});
