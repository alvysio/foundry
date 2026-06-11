/**
 * BEM document-intelligence provider — wraps the official `bem-ai-sdk`
 * TypeScript client (https://github.com/bem-team/bem-typescript-sdk).
 *
 * Internal-only. The upstream vendor identity is confined to this module; the
 * action layer consumes the normalized shapes exported here and never names
 * the vendor in any user-facing string. Synchronous mode is used for every
 * call (`wait=true`, ≤30s server-side wait budget) with the SDK's
 * `waitForCall` polling fallback so callers get a terminal result within the
 * configured document timeout. See https://docs.bem.ai/guide/synchronous-mode.
 *
 * Workflows are provisioned on demand: `ensureDocumentWorkflow` creates a
 * single-node workflow (function + graph) named after the Activepieces flow
 * and step that triggered it, so every document step has a matching upstream
 * workflow it can call. See https://docs.bem.ai/guide/system-overview.
 */

import Bem, {
  CallFailedError,
  CallTimeoutError,
  NotFoundError,
  upsertFunction,
  upsertWorkflow,
  waitForCall,
} from 'bem-ai-sdk';
import type { Call } from 'bem-ai-sdk/resources/calls';
import type { FNavigateParams } from 'bem-ai-sdk/resources/fs';
import type { FunctionCreateParams } from 'bem-ai-sdk/resources/functions/functions';
import type { Event as BemEvent, InputType } from 'bem-ai-sdk/resources/outputs';

type DocumentFunctionBody =
  | Omit<FunctionCreateParams.CreateExtractFunction, 'functionName'>
  | Omit<FunctionCreateParams.CreateClassifyFunction, 'functionName'>
  | Omit<FunctionCreateParams.CreateParseFunction, 'functionName'>;

const DEFAULT_BASE_URL_BY_ENVIRONMENT: Readonly<Record<string, string>> = {
  production: 'https://api.bem.ai',
  qa: 'https://api.bem.ai',
};

// Client timeout must exceed the 30s server-side wait budget (TLS + network overhead).
const CLIENT_TIMEOUT_MS = 35_000;

const MAIN_NODE_NAME = 'main';

function createClient({ apiKey, baseUrl }: { apiKey: string; baseUrl: string }): Bem {
  return new Bem({ apiKey, baseURL: baseUrl, timeout: CLIENT_TIMEOUT_MS });
}

function inferInputType(fileName: string): InputType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const byExt: Record<string, InputType> = {
    pdf: 'pdf',
    png: 'png',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    webp: 'webp',
    heic: 'heic',
    heif: 'heif',
    csv: 'csv',
    xls: 'xls',
    xlsx: 'xlsx',
    docx: 'docx',
    txt: 'text',
    html: 'html',
    json: 'json',
    xml: 'xml',
    eml: 'email',
  };
  return byExt[ext] ?? 'pdf';
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function workflowNameFor({
  flowName,
  stepName,
  primitive,
}: {
  flowName: string;
  stepName: string;
  primitive: DocumentPrimitive;
}): string {
  return ['alvys', slugify(flowName), slugify(stepName), primitive].filter(Boolean).join('-');
}

function functionBodyFor(params: EnsureWorkflowParams): DocumentFunctionBody {
  switch (params.primitive) {
    case 'extract':
      return {
        type: 'extract',
        displayName: params.displayName,
        outputSchemaName: `${params.workflowName}-schema`,
        outputSchema: {
          type: 'object',
          description: params.extractDescription ?? 'Structured data extracted from a transportation document.',
          properties: params.extractSchemaProperties ?? {},
          additionalProperties: true,
        },
      };
    // The native classify function type is a router: its choice is only
    // model-driven when the workflow has destination edges per classification
    // (verified against the live API 2026-06-10 — a single-node classify
    // workflow echoes the first classification regardless of content).
    // Single-label classification is therefore provisioned as an extract
    // function with an enum field, which classified both test documents
    // correctly. A user-supplied Workflow Override pointing at a real
    // edge-routed classify workflow is still honored by readClassifyOutput.
    case 'classify': {
      const classifications = params.classifications ?? [];
      const criteria = classifications.map((c) => `${c.name} = ${c.description}`).join(' ');
      return {
        type: 'extract',
        displayName: params.displayName,
        outputSchemaName: `${params.workflowName}-schema`,
        outputSchema: {
          type: 'object',
          properties: {
            documentType: {
              type: 'string',
              enum: [...classifications.map((c) => c.name), 'other'],
              description: `The single best matching document type. ${criteria} other = none of these.`,
            },
            confidence: {
              type: 'number',
              description: 'Confidence between 0 and 1 that documentType is correct.',
            },
          },
          required: ['documentType'],
        },
      };
    }
    case 'parse':
      return {
        type: 'parse',
        displayName: params.displayName,
        parseConfig: { extractEntities: true, linkAcrossDocuments: true },
      };
  }
}

/**
 * Idempotently provision the single-node workflow backing a document step.
 * Existing workflow → no-op (no config churn on the hot path) unless
 * `updateExisting` is set, in which case function + workflow are upserted to
 * the supplied configuration (new version upstream). Upsert semantics make
 * concurrent provisioning safe.
 */
async function ensureDocumentWorkflow(params: EnsureWorkflowParams): Promise<{ created: boolean }> {
  const client = createClient(params);
  if (!params.updateExisting) {
    try {
      await client.workflows.retrieve(params.workflowName);
      return { created: false };
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
    }
  }

  const functionName = `${params.workflowName}-fn`;
  const functionBody: DocumentFunctionBody = functionBodyFor(params);
  await upsertFunction(client, functionName, functionBody);
  const result = await upsertWorkflow(client, params.workflowName, {
    displayName: params.displayName,
    mainNodeName: MAIN_NODE_NAME,
    nodes: [{ name: MAIN_NODE_NAME, function: { name: functionName } }],
  });
  return { created: result.created };
}

/**
 * Synchronous call with polling fallback. A still-running result is not an
 * error — the call keeps running server-side, so we poll until terminal
 * status or the timeout budget is spent.
 */
async function callWorkflowAndAwait(params: {
  apiKey: string;
  baseUrl: string;
  workflowName: string;
  callReferenceId?: string;
  fileBase64: string;
  fileName: string;
  timeoutMs: number;
}): Promise<Call> {
  const client = createClient(params);
  const startedAt = Date.now();
  const response = await client.workflows.call(params.workflowName, {
    wait: true,
    ...(params.callReferenceId ? { callReferenceID: params.callReferenceId } : {}),
    input: {
      singleFile: {
        inputType: inferInputType(params.fileName),
        inputContent: params.fileBase64,
      },
    },
  });

  let call = response.call;
  if (!call) {
    throw new Error(`Document workflow "${params.workflowName}" returned no call data.`);
  }

  if ((call.status === 'pending' || call.status === 'running') && call.callID) {
    const remainingMs = Math.max(1000, params.timeoutMs - (Date.now() - startedAt));
    try {
      const finished = await waitForCall(client, call.callID, {
        until: 'completed',
        timeoutMs: remainingMs,
      });
      call = finished.call ?? call;
    } catch (err) {
      if (err instanceof CallTimeoutError) {
        throw new Error(
          `Document workflow "${params.workflowName}" did not complete within ${params.timeoutMs}ms (call ${err.callID} is still running). Increase the Document Timeout or retry later.`,
        );
      }
      if (err instanceof CallFailedError) {
        throw new Error(
          `Document workflow "${params.workflowName}" failed: ${readErrorMessages(err.response.call)}`,
        );
      }
      throw err;
    }
  }

  if (call.status === 'failed') {
    throw new Error(`Document workflow "${params.workflowName}" failed: ${readErrorMessages(call)}`);
  }
  if (call.status !== 'completed') {
    throw new Error(
      `Document workflow "${params.workflowName}" did not complete within ${params.timeoutMs}ms (call ${call.callID || 'unknown'} is still ${call.status ?? 'pending'}). Increase the Document Timeout or retry later.`,
    );
  }
  return call;
}

function readErrorMessages(call: Call | undefined): string {
  const messages = (call?.errors ?? [])
    .map((e) => {
      if ('errorMessage' in e && typeof e.errorMessage === 'string') return e.errorMessage;
      if ('errorCode' in e && typeof e.errorCode === 'string') return e.errorCode;
      return undefined;
    })
    .filter((m): m is string => typeof m === 'string');
  return messages.join('; ') || 'no error detail returned';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function eventContent(event: BemEvent | undefined): Record<string, unknown> {
  if (event && 'transformedContent' in event && isRecord(event.transformedContent)) {
    return event.transformedContent;
  }
  return {};
}

function eventConfidence(event: BemEvent | undefined): number | undefined {
  if (event && 'confidence' in event && typeof event.confidence === 'number') {
    return event.confidence;
  }
  return undefined;
}

function readExtractOutput(call: Call): { content: Record<string, unknown>; confidence: number | undefined } {
  const output = (call.outputs ?? []).find((o) =>
    ['extract', 'transform', 'join', 'analyze'].includes(o.eventType ?? ''),
  );
  return { content: eventContent(output), confidence: eventConfidence(output) };
}

function readClassifyOutput(call: Call): { choice: string | undefined; confidence: number | undefined } {
  const classifyEvent = (call.outputs ?? []).find((o) => o.eventType === 'classify');
  if (classifyEvent && 'choice' in classifyEvent && typeof classifyEvent.choice === 'string') {
    return { choice: classifyEvent.choice, confidence: eventConfidence(classifyEvent) };
  }
  const { content, confidence } = readExtractOutput(call);
  const choice = typeof content['documentType'] === 'string' ? content['documentType'] : undefined;
  const extractedConfidence =
    typeof content['confidence'] === 'number' ? content['confidence'] : confidence;
  return { choice, confidence: extractedConfidence };
}

function readParseOutput(call: Call): { content: Record<string, unknown> | null } {
  const output = (call.outputs ?? []).find((o) => o.eventType === 'parse');
  const content = eventContent(output);
  return { content: Object.keys(content).length > 0 ? content : null };
}

async function fsQuery(params: {
  apiKey: string;
  baseUrl: string;
  body: FNavigateParams;
}): Promise<Record<string, unknown>> {
  const client = createClient(params);
  const result: unknown = await client.fs.navigate(params.body);
  return isRecord(result) ? result : {};
}

function resolveBaseUrl({ override, environment }: { override?: string; environment: string }): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed.replace(/\/+$/, '');
  return DEFAULT_BASE_URL_BY_ENVIRONMENT[environment] ?? DEFAULT_BASE_URL_BY_ENVIRONMENT['production'];
}

function isMissingWorkflowError(err: unknown): boolean {
  return err instanceof NotFoundError;
}

export const bemProvider = {
  ensureDocumentWorkflow,
  isMissingWorkflowError,
  callWorkflowAndAwait,
  fsQuery,
  readExtractOutput,
  readClassifyOutput,
  readParseOutput,
  resolveBaseUrl,
  inferInputType,
  workflowNameFor,
};

export type DocumentPrimitive = 'extract' | 'classify' | 'parse';

export type EnsureWorkflowParams = {
  apiKey: string;
  baseUrl: string;
  workflowName: string;
  primitive: DocumentPrimitive;
  displayName: string;
  updateExisting?: boolean;
  extractDescription?: string;
  extractSchemaProperties?: Record<string, { type: string; description: string }>;
  classifications?: Array<{ name: string; description: string }>;
};

export type BemCall = Call;
export type BemFsParams = FNavigateParams;
export type BemFsOp = FNavigateParams['op'];
