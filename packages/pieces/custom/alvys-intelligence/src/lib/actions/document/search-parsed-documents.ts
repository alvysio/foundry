import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { bemProvider, BemFsOp, BemFsParams } from '../../runtime/providers/bem';
import { advancedProp } from '../common/advanced-prop';
import { documentCall } from '../common/document-call';

const FS_OPS: ReadonlyArray<BemFsOp> = ['ls', 'cat', 'head', 'stat', 'grep', 'find', 'open', 'xref'];

function parseOp(value: string | undefined): BemFsOp {
  const op = FS_OPS.find((o) => o === (value ?? 'grep'));
  if (!op) throw new Error('Invalid Operation.');
  return op;
}

export const searchParsedDocuments = createAction({
  auth: alvysIntelligenceAuth,
  name: 'search_parsed_documents',
  displayName: 'Search Parsed Documents',
  description:
    'Query documents parsed by the Parse Document action: list (ls), read (cat / head), search (grep), and entity-graph queries (find / open / xref).',
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
          { label: 'stat — document or entity metadata', value: 'stat' },
          { label: 'grep — search content', value: 'grep' },
          { label: 'find — query entity graph', value: 'find' },
          { label: 'open — entity detail with all mentions', value: 'open' },
          { label: 'xref — sections across documents mentioning an entity', value: 'xref' },
        ],
      },
    }),
    path: Property.ShortText({
      displayName: 'Path',
      description:
        'Call Reference Id of a parsed document (for cat / head / stat / grep scoping), or an entity id from a previous find result (for open / xref / stat).',
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
    advanced: advancedProp,
  },
  async run(context) {
    const p = context.propsValue;
    const op = parseOp(p.op);
    if (['cat', 'head', 'stat', 'open', 'xref'].includes(op) && !p.path?.trim()) {
      throw new Error(`Operation "${op}" requires a Path.`);
    }
    if (op === 'grep' && !p.pattern?.trim()) {
      throw new Error('Operation "grep" requires a Pattern.');
    }

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

    const body: BemFsParams = {
      op,
      ...(p.path?.trim() ? { path: p.path.trim() } : {}),
      ...(p.pattern?.trim() ? { pattern: p.pattern.trim() } : {}),
      ...(p.regex ? { regex: true } : {}),
      ...(p.countOnly ? { countOnly: true } : {}),
      ...(p.scope ? { scope: p.scope } : {}),
      ...(p.entityType?.trim() ? { filter: { type: p.entityType.trim() } } : {}),
      ...(typeof p.limit === 'number' ? { limit: p.limit } : {}),
      ...(p.range && Object.keys(p.range).length > 0 ? { range: p.range } : {}),
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
