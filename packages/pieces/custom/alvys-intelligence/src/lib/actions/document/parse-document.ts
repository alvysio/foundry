import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';
import { documentPipeline } from '../../runtime/document-pipeline';

export const parseDocument = createAction({
  auth: alvysIntelligenceAuth,
  name: 'parse_document',
  displayName: 'Parse Document',
  description:
    'Parse a document into page-aware sections, named entities, and relationships via a BEM Parse workflow (synchronous mode). The parsed output is stored in the BEM file system under the Call Reference Id and can be queried with the Search Parsed Documents action.',
  props: {
    file: Property.File({
      displayName: 'Document',
      description: 'PDF, PNG, JPG, TIFF, or spreadsheet. Max 25 MB.',
      required: true,
    }),
    callReferenceId: Property.ShortText({
      displayName: 'Call Reference Id',
      description:
        'Identifier for the parsed document in the BEM file system — used as the `path` for Search Parsed Documents queries (ls / cat / grep / find / xref).',
      required: true,
    }),
    fetchParsedContent: Property.Checkbox({
      displayName: 'Fetch Parsed Content',
      description:
        'After parsing completes, read the parsed document back from the BEM file system (`cat`) and include it in the output.',
      required: false,
      defaultValue: true,
    }),
    workflowName: Property.ShortText({
      displayName: 'BEM Workflow Override',
      description: 'Optional BEM workflow name. Leave blank to use the Alvys document-parse workflow.',
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

    const workflowName =
      context.propsValue.workflowName?.trim() || documentPipeline.parseWorkflowId();
    const file = context.propsValue.file;

    try {
      const result = await bemProvider.callWorkflowAndAwait({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        workflowName,
        callReferenceId,
        fileBase64: file.base64,
        fileName: file.filename,
        timeoutMs: call.config.documentTimeoutMs,
      });

      const parseOutput = (result.outputs ?? []).find((o) => o.eventType === 'parse');
      const embedded =
        parseOutput?.transformedContent && Object.keys(parseOutput.transformedContent).length > 0
          ? parseOutput.transformedContent
          : null;

      let parsedContent: Record<string, unknown> | null = embedded;
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
