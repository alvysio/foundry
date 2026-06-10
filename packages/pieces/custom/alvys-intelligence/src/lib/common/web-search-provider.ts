import { AIProviderName } from '@activepieces/shared';

/**
 * Maps an Alvys Intelligence tier to the underlying AI provider used by
 * `buildWebSearchConfig` from `@activepieces/piece-ai` so we get a native
 * web-search tool instead of a silent no-op.
 *
 * Keep the mapping in sync with the server-side `alvys-intelligence-provider`
 * strategy in `packages/server/api/src/app/ai/providers/`.
 */
export function resolveWebSearchProvider(modelId: string | undefined): AIProviderName {
  switch (modelId) {
    case 'alvys-smart':
      return AIProviderName.ANTHROPIC;
    case 'alvys-long-context':
      return AIProviderName.GOOGLE;
    case 'alvys-fast':
    case 'alvys-balanced':
    default:
      return AIProviderName.OPENAI;
  }
}
