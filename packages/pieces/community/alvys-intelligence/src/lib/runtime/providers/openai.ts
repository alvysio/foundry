import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { ChatMessage, ChatResponse } from './index';

export async function openaiChat(params: {
  apiKey: string;
  modelId: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<ChatResponse> {
  const response = await httpClient.sendRequest<{
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  }>({
    method: HttpMethod.POST,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'content-type': 'application/json',
    },
    body: {
      model: params.modelId,
      messages: params.messages,
      max_completion_tokens: params.maxOutputTokens ?? 2048,
      temperature: params.temperature ?? 1,
    },
  });

  const text = response.body.choices?.[0]?.message?.content ?? '';
  return {
    text,
    inputTokens: response.body.usage?.prompt_tokens ?? 0,
    outputTokens: response.body.usage?.completion_tokens ?? 0,
  };
}
