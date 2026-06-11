/**
 * Client for the Alvys Insights chat BFF (`alvysio/frontend`,
 * `apps/alvys-ui .../api/chat`). The BFF proxies Snowflake Cortex Agents using
 * the objectless `cortex/agent:run` invocation (frontend PR #24359) — agent
 * spec (tools, instructions, orchestration) is resolved server-side, so this
 * client only needs agent name, messages, and an optional model override.
 */

function defaultBaseUrl(environment: string): string {
  return environment === 'qa' ? 'https://qa.alvys.net' : 'https://app.alvys.com';
}

function readChatConnection(auth: unknown): ChatConnection {
  const value = (auth ?? {}) as Record<string, unknown>;
  const props = (value['props'] ?? value) as Record<string, unknown>;
  const str = (key: string): string | undefined => {
    const raw = props[key];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
  };

  const bearerToken = str('chatBearerToken');
  if (!bearerToken) {
    throw new Error(
      'Chat Bearer Token is missing on the Alvys Intelligence connection. ' +
        'It must be an Auth0-issued Alvys JWT (company-code claim) accepted by the Insights chat API.',
    );
  }
  const environment = str('environment') ?? 'production';
  return {
    baseUrl: (str('chatBaseUrl') ?? defaultBaseUrl(environment)).replace(/\/$/, ''),
    bearerToken,
  };
}

function buildHeaders(connection: ChatConnection, accept: string): Record<string, string> {
  return {
    Authorization: `Bearer ${connection.bearerToken}`,
    'Content-Type': 'application/json',
    Accept: accept,
    'User-Agent': 'alvys-intelligence-piece',
  };
}

async function readErrorBody(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '');
  const redacted = raw.replace(/Bearer\s+[\w-.]+/gi, 'Bearer [REDACTED]').slice(0, 1500);
  try {
    const parsed = JSON.parse(redacted) as Record<string, unknown>;
    const message = typeof parsed['message'] === 'string' ? parsed['message'] : '';
    const error = typeof parsed['error'] === 'string' ? parsed['error'] : '';
    return [error, message].filter(Boolean).join(': ') || redacted;
  } catch {
    return redacted;
  }
}

async function listAgents(connection: ChatConnection): Promise<ChatAgentSummary[]> {
  const res = await fetch(`${connection.baseUrl}/api/chat/agents`, {
    method: 'GET',
    headers: buildHeaders(connection, 'application/json'),
  });
  if (!res.ok) {
    throw new Error(`Agents list failed (HTTP ${res.status}): ${await readErrorBody(res)}`);
  }
  const json = (await res.json()) as unknown;
  const agents = Array.isArray(json)
    ? json
    : Array.isArray((json as { agents?: unknown[] })?.agents)
      ? (json as { agents: unknown[] }).agents
      : [];
  return agents
    .map((agent) => {
      const obj = (agent ?? {}) as Record<string, unknown>;
      return {
        name: typeof obj['name'] === 'string' ? obj['name'] : '',
        description:
          typeof obj['description'] === 'string'
            ? obj['description']
            : typeof obj['comment'] === 'string'
              ? obj['comment']
              : undefined,
      };
    })
    .filter((agent) => agent.name.length > 0);
}

async function listModels(connection: ChatConnection): Promise<ChatModelSummary[]> {
  const res = await fetch(`${connection.baseUrl}/api/chat/models`, {
    method: 'GET',
    headers: buildHeaders(connection, 'application/json'),
  });
  if (!res.ok) {
    throw new Error(`Models list failed (HTTP ${res.status}): ${await readErrorBody(res)}`);
  }
  const json = (await res.json()) as { llm_models?: unknown[] };
  return (json.llm_models ?? [])
    .map((model) => {
      const obj = (model ?? {}) as Record<string, unknown>;
      return {
        id: typeof obj['id'] === 'string' ? obj['id'] : '',
        label: typeof obj['label'] === 'string' ? obj['label'] : '',
      };
    })
    .filter((model) => model.id.length > 0);
}

async function createThread(connection: ChatConnection): Promise<string> {
  const res = await fetch(`${connection.baseUrl}/api/chat/threads`, {
    method: 'POST',
    headers: buildHeaders(connection, 'application/json'),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Thread creation failed (HTTP ${res.status}): ${await readErrorBody(res)}`);
  }
  const json = (await res.json()) as { threadId?: unknown };
  if (typeof json.threadId !== 'string' && typeof json.threadId !== 'number') {
    throw new Error('Thread creation returned no threadId.');
  }
  return String(json.threadId);
}

function tryParseJson(data: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function tryParseJsonArray(data: string): unknown[] {
  try {
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSseBlock(rawBlock: string): { event: string; data: string } | null {
  const lines = rawBlock
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.length > 0 && !line.startsWith(':'));
  if (lines.length === 0) return null;

  let event = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim() || event;
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).replace(/^ /, ''));
    }
  }
  return { event, data: dataLines.join('\n') };
}

async function consumeChatStream(input: {
  res: Response;
  onText?: (accumulated: string) => Promise<void>;
}): Promise<ChatRunResult> {
  const result: ChatRunResult = {
    text: '',
    attachments: [],
    citations: [],
    thinkingSteps: [],
    assistantMessageId: undefined,
  };

  const body = input.res.body;
  if (!body) return result;

  const handleEvent = async (evt: { event: string; data: string }): Promise<void> => {
    switch (evt.event) {
      case 'text':
        // Raw string payload (not JSON) — streamed answer deltas.
        result.text += evt.data;
        await input.onText?.(result.text);
        return;
      case 'attachments':
        result.attachments.push(...tryParseJsonArray(evt.data));
        return;
      case 'citations':
        result.citations.push(...tryParseJsonArray(evt.data));
        return;
      case 'thinking_step': {
        const parsed = tryParseJson(evt.data);
        if (parsed) result.thinkingSteps.push(parsed);
        return;
      }
      case 'metadata': {
        const parsed = tryParseJson(evt.data);
        if (parsed?.['role'] === 'assistant' && typeof parsed['message_id'] === 'number') {
          result.assistantMessageId = parsed['message_id'];
        }
        return;
      }
      case 'error': {
        const parsed = tryParseJson(evt.data);
        const message =
          typeof parsed?.['message'] === 'string' ? (parsed['message'] as string) : evt.data;
        throw new Error(`Alvys chat agent error: ${message}`);
      }
      default:
        return;
    }
  };

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Streaming requires sequential reads; SSE frames are split on blank lines.
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const evt = parseSseBlock(block);
      if (evt) await handleEvent(evt);
      idx = buffer.indexOf('\n\n');
    }
  }
  const trailing = parseSseBlock(buffer);
  if (trailing) await handleEvent(trailing);

  return result;
}

async function askAgent(input: {
  connection: ChatConnection;
  threadId: string;
  agentName: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  parentMessageId: number;
  llmModel?: string;
  onText?: (accumulated: string) => Promise<void>;
}): Promise<ChatRunResult> {
  const { connection } = input;
  const url = `${connection.baseUrl}/api/chat/${encodeURIComponent(input.threadId)}/stream`;
  const payload = {
    parentMessageId: input.parentMessageId,
    messages: input.messages,
    agent: { name: input.agentName },
    runtime: 'analyst',
    ...(input.llmModel ? { llmModel: input.llmModel } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(connection, 'text/event-stream'),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Agent run failed (HTTP ${res.status}): ${await readErrorBody(res)}`);
  }
  return consumeChatStream({ res, onText: input.onText });
}

export const alvysChatApi = {
  readChatConnection,
  listAgents,
  listModels,
  createThread,
  askAgent,
};

export type ChatConnection = {
  baseUrl: string;
  bearerToken: string;
};

export type ChatAgentSummary = {
  name: string;
  description?: string;
};

export type ChatModelSummary = {
  id: string;
  label: string;
};

export type ChatRunResult = {
  text: string;
  attachments: unknown[];
  citations: unknown[];
  thinkingSteps: Record<string, unknown>[];
  assistantMessageId: number | undefined;
};
