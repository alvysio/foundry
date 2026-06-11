/**
 * BEM document-intelligence provider — direct wrapper over the BEM v3 API.
 *
 * Internal-only. Action code consumes the normalized shapes exported here and
 * never builds BEM URLs or reads raw call objects itself. Synchronous mode is
 * used for every call (`wait=true`, ≤30s server-side wait budget) with an
 * automatic polling fallback on HTTP 202 so callers get a terminal result
 * within the configured document timeout. See https://docs.bem.ai/guide/synchronous-mode.
 */

import { httpClient, HttpMethod } from '@activepieces/pieces-common';

const DEFAULT_BASE_URL_BY_ENVIRONMENT: Readonly<Record<string, string>> = {
  production: 'https://api.bem.ai',
  qa: 'https://api.bem.ai',
};

// Server stops waiting at 30s; poll cadence for the 202 fallback path.
const POLL_INTERVAL_MS = 2000;

function inferInputType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const byExt: Record<string, string> = {
    pdf: 'pdf',
    png: 'png',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    tif: 'tiff',
    tiff: 'tiff',
    csv: 'csv',
    xlsx: 'xlsx',
    xls: 'xlsx',
    docx: 'docx',
    txt: 'text',
    eml: 'email',
  };
  return byExt[ext] ?? 'pdf';
}

function readErrorMessages(call: BemCall): string[] {
  const fromErrors = (call.errors ?? []).map((e) => e.errorMessage ?? e.errorCode ?? 'Unknown upstream error');
  const fromOutputs = (call.outputs ?? [])
    .filter((o) => o.eventType === 'error')
    .map((o) => o.errorMessage ?? o.errorCode ?? 'Unknown upstream function error');
  return [...fromErrors, ...fromOutputs];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWorkflowSync(params: {
  apiKey: string;
  baseUrl: string;
  workflowName: string;
  callReferenceId?: string;
  fileBase64: string;
  fileName: string;
}): Promise<BemCall> {
  const response = await httpClient.sendRequest<{ call?: BemCall } & BemCall>({
    method: HttpMethod.POST,
    url: `${params.baseUrl}/v3/workflows/${encodeURIComponent(params.workflowName)}/call?wait=true`,
    headers: {
      'x-api-key': params.apiKey,
      'content-type': 'application/json',
    },
    body: {
      ...(params.callReferenceId ? { callReferenceID: params.callReferenceId } : {}),
      input: {
        singleFile: {
          inputType: inferInputType(params.fileName),
          inputContent: params.fileBase64,
        },
      },
    },
  });
  return response.body.call ?? response.body;
}

async function getCall(params: { apiKey: string; baseUrl: string; callId: string }): Promise<BemCall> {
  const response = await httpClient.sendRequest<{ call?: BemCall } & BemCall>({
    method: HttpMethod.GET,
    url: `${params.baseUrl}/v3/calls/${encodeURIComponent(params.callId)}`,
    headers: { 'x-api-key': params.apiKey },
  });
  return response.body.call ?? response.body;
}

/**
 * Synchronous call with polling fallback. A 202/pending result is not an
 * error — the call keeps running server-side, so we poll `GET /v3/calls/{id}`
 * until terminal status or the timeout budget is spent.
 */
async function callWorkflowAndAwait(params: {
  apiKey: string;
  baseUrl: string;
  workflowName: string;
  callReferenceId?: string;
  fileBase64: string;
  fileName: string;
  timeoutMs: number;
}): Promise<BemCall> {
  const startedAt = Date.now();
  let call = await callWorkflowSync(params);

  while (call.status === 'pending' || call.status === 'running') {
    if (!call.callID) break;
    if (Date.now() - startedAt + POLL_INTERVAL_MS > params.timeoutMs) {
      break;
    }
    await sleep(POLL_INTERVAL_MS);
    call = await getCall({ apiKey: params.apiKey, baseUrl: params.baseUrl, callId: call.callID });
  }

  if (call.status === 'failed') {
    const messages = readErrorMessages(call);
    throw new Error(`Document workflow "${params.workflowName}" failed: ${messages.join('; ') || 'no error detail returned'}`);
  }
  if (call.status !== 'completed') {
    throw new Error(
      `Document workflow "${params.workflowName}" did not complete within ${params.timeoutMs}ms (call ${call.callID ?? 'unknown'} is still ${call.status}). Increase the Document Timeout or retry later.`,
    );
  }
  return call;
}

function readExtractOutput(call: BemCall): { content: Record<string, unknown>; output: BemCallOutput | undefined } {
  const output = (call.outputs ?? []).find(
    (o) => o.eventType === 'extract' || o.eventType === 'transform' || o.eventType === 'join' || o.eventType === 'analyze',
  );
  const content = (output?.transformedContent ?? {}) as Record<string, unknown>;
  return { content, output };
}

function readClassifyOutput(call: BemCall): { choice: string | undefined; output: BemCallOutput | undefined } {
  const output = (call.outputs ?? []).find((o) => o.eventType === 'classify');
  const rawChoice = output?.choice;
  if (typeof rawChoice === 'string') return { choice: rawChoice, output };
  if (rawChoice && typeof rawChoice === 'object') {
    const obj = rawChoice as Record<string, unknown>;
    const name = obj['name'] ?? obj['classification'] ?? obj['choice'];
    return { choice: typeof name === 'string' ? name : undefined, output };
  }
  return { choice: undefined, output };
}

async function fsQuery(params: {
  apiKey: string;
  baseUrl: string;
  body: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const response = await httpClient.sendRequest<Record<string, unknown>>({
    method: HttpMethod.POST,
    url: `${params.baseUrl}/v3/fs`,
    headers: {
      'x-api-key': params.apiKey,
      'content-type': 'application/json',
    },
    body: params.body,
  });
  return response.body;
}

function resolveBaseUrl({ override, environment }: { override?: string; environment: string }): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed.replace(/\/+$/, '');
  return DEFAULT_BASE_URL_BY_ENVIRONMENT[environment] ?? DEFAULT_BASE_URL_BY_ENVIRONMENT['production'];
}

export const bemProvider = {
  callWorkflowAndAwait,
  getCall,
  fsQuery,
  readExtractOutput,
  readClassifyOutput,
  resolveBaseUrl,
  inferInputType,
};

export type BemCallOutput = {
  eventType: string;
  functionName?: string;
  transformedContent?: Record<string, unknown>;
  enrichedContent?: Record<string, unknown>;
  choice?: unknown;
  confidence?: number;
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: unknown;
};

export type BemCall = {
  callID: string;
  status: 'completed' | 'pending' | 'running' | 'failed';
  outputs?: BemCallOutput[];
  errors?: Array<{ errorMessage?: string; errorCode?: string }>;
  url?: string;
  traceUrl?: string;
};
