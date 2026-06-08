import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { ChatMessage, ChatResponse } from './index';

export async function geminiChat(params: {
  apiKey: string;
  modelId: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<ChatResponse> {
  const system = params.messages.find((m) => m.role === 'system')?.content;
  const conversation = params.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    params.modelId,
  )}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

  const response = await httpClient.sendRequest<{
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  }>({
    method: HttpMethod.POST,
    url,
    headers: { 'content-type': 'application/json' },
    body: {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: conversation,
      generationConfig: {
        temperature: params.temperature ?? 1,
        maxOutputTokens: params.maxOutputTokens ?? 2048,
      },
    },
  });

  const text = (response.body.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('');

  return {
    text,
    inputTokens: response.body.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.body.usageMetadata?.candidatesTokenCount ?? 0,
  };
}
