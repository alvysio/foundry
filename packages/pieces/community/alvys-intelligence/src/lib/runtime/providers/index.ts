/**
 * Vendor providers — direct HTTP calls from the piece sandbox.
 *
 * Each provider:
 *   - accepts a normalized `ChatRequest` (messages, maxTokens, temperature)
 *   - calls the upstream chat-completion endpoint with the vendor-specific key
 *   - returns a normalized `ChatResponse` (text, usage)
 *
 * Vendor identity NEVER leaks past these modules. Callers receive only the
 * normalized shape; the action layer maps the response to Alvys-shaped output
 * before returning to the AP flow.
 */

import { anthropicChat } from './anthropic';
import { openaiChat } from './openai';
import { geminiChat } from './gemini';
import { documentIntelExtract } from './document-intel';
import { VendorProvider } from '../tier-router';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  modelId: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export type ChatResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

export type ProviderKeyMap = {
  anthropic?: string;
  openai?: string;
  gemini?: string;
  'document-intel'?: string;
};

export async function callChatProvider(params: {
  provider: VendorProvider;
  request: ChatRequest;
  keys: ProviderKeyMap;
}): Promise<ChatResponse> {
  switch (params.provider) {
    case 'anthropic': {
      if (!params.keys.anthropic) throw new Error('Anthropic API key is not configured.');
      return anthropicChat({ ...params.request, apiKey: params.keys.anthropic });
    }
    case 'openai': {
      if (!params.keys.openai) throw new Error('OpenAI API key is not configured.');
      return openaiChat({ ...params.request, apiKey: params.keys.openai });
    }
    case 'gemini': {
      if (!params.keys.gemini) throw new Error('Gemini API key is not configured.');
      return geminiChat({ ...params.request, apiKey: params.keys.gemini });
    }
    case 'document-intel': {
      throw new Error('Document Intelligence is for document extraction only — use the Extract Document action.');
    }
  }
}

export { documentIntelExtract };
export type { DocumentExtractRequestInternal, DocumentExtractResponseInternal } from './document-intel';
