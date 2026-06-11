import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';

export const searchParsedDocuments = createAction({
  auth: alvysIntelligenceAuth,
  name: 'search_parsed_documents',
  displayName: 'Search Parsed Documents',
  description:
    'Query documents parsed by the Parse Document action through the BEM file system API: list (ls), read (cat / head), search (grep), and entity-graph queries (find / xref).',
  props: {
    op: Property.StaticDropdown<string>({
      displayName: 'Operation',
      required: true,
      defaultValue: 'grep',
      options: {
        options: [
          { label: 'ls — list parsed documents', value: 'ls' },
          { label: 'cat — read a parsed document', value: 'cat' },
          { label: 'head — read the start of a document', value: 'head' },
          { label: 'stat — document metadata', value: 'stat' },
          { label: 'grep — search content', value: 'grep' },
          { label: 'find — query entity graph', value: 'find' },
          { label: 'xref — cross-reference an entity', value: 'xref' },
        ],
      },
    }),
    path: Property.ShortText({
      displayName: 'Path (Call Reference Id)',
      description: 'The Call Reference Id used when parsing. Required for cat / head / stat.',
      required: false,
    }),
    pattern: Property.ShortText({
      displayName: 'Pattern',
      description: 'Search pattern for grep.',
      required: false,
    }),
    regex: Property.Checkbox({
      displayName: 'Regex Pattern',
      description: 'Treat the grep pattern as a regular expression.',
      required: false,
      defaultValue: false,
    }),
    countOnly: Property.Checkbox({
      displayName: 'Count Only',
      description: 'For grep: return only the number of hits.',
      required: false,
      defaultValue: false,
    }),
    scope: Property.StaticDropdown<string>({
      displayName: 'Scope',
      description: 'For grep: which parsed structures to search.',
      required: false,
      options: {
        options: [
          { label: 'All', value: 'all' },
          { label: 'Sections', value: 'sections' },
          { label: 'Entities', value: 'entities' },
          { label: 'Relationships', value: 'relationships' },
        ],
      },
    }),
    entityType: Property.ShortText({
      displayName: 'Entity Type',
      description: 'For find: filter the entity graph (e.g. organization, person, monetary_amount).',
      required: false,
    }),
    entityId: Property.ShortText({
      displayName: 'Entity Id',
      description: 'For xref: the entityID returned by a previous find operation.',
      required: false,
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'Maximum number of results.',
      required: false,
    }),
    range: Property.Json({
      displayName: 'Range',
      description: 'For cat: restrict to a page or section, e.g. { "page": 4 }.',
      required: false,
    }),
    extra: Property.Json({
      displayName: 'Extra Parameters',
      description: 'Escape hatch — merged verbatim into the file-system request body.',
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
      rateKeySuffix: 'fs',
      unavailableMessage: 'Parsed-document search is temporarily unavailable. Retry shortly.',
    });

    const p = context.propsValue;
    const op = p.op ?? 'grep';
    if (['cat', 'head', 'stat'].includes(op) && !p.path?.trim()) {
      throw new Error(`Operation "${op}" requires a Path (Call Reference Id).`);
    }
    if (op === 'grep' && !p.pattern?.trim()) {
      throw new Error('Operation "grep" requires a Pattern.');
    }
    if (op === 'xref' && !p.entityId?.trim()) {
      throw new Error('Operation "xref" requires an Entity Id.');
    }

    const body: Record<string, unknown> = {
      op,
      ...(p.path?.trim() ? { path: p.path.trim() } : {}),
      ...(p.pattern?.trim() ? { pattern: p.pattern.trim() } : {}),
      ...(p.regex ? { regex: true } : {}),
      ...(p.countOnly ? { countOnly: true } : {}),
      ...(p.scope ? { scope: p.scope } : {}),
      ...(p.entityType?.trim() ? { type: p.entityType.trim() } : {}),
      ...(p.entityId?.trim() ? { entityID: p.entityId.trim() } : {}),
      ...(typeof p.limit === 'number' ? { limit: p.limit } : {}),
      ...(p.range && Object.keys(p.range).length > 0 ? { range: p.range } : {}),
      ...((p.extra as Record<string, unknown> | undefined) ?? {}),
    };

    try {
      const result = await bemProvider.fsQuery({
        apiKey: call.apiKey,
        baseUrl: call.baseUrl,
        body,
      });
      await call.recordSuccess();
      return {
        op,
        result,
        rateLimit: call.rateLimit,
      };
    } catch (err) {
      await call.recordFailure();
      throw err;
    }
  },
});
