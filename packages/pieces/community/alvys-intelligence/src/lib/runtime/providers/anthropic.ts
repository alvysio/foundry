import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { ChatMessage, ChatResponse } from './index';

export async function anthropicChat(params: {
  apiKey: string;
  modelId: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<ChatResponse> {
  const system = params.messages.find((m) => m.role === 'system')?.content;
  const conversation = params.messages.filter((m) => m.role !== 'system');

  const response = await httpClient.sendRequest<{
    content: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  }>({
    method: HttpMethod.POST,
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: {
      model: params.modelId,
      max_tokens: params.maxOutputTokens ?? 2048,
      temperature: params.temperature ?? 1,
      ...(system ? { system } : {}),
      messages: conversation.map((m) => ({ role: m.role, content: m.content })),
    },
  });

  const text = (response.body.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');

  return {
    text,
    inputTokens: response.body.usage?.input_tokens ?? 0,
    outputTokens: response.body.usage?.output_tokens ?? 0,
  };
}
