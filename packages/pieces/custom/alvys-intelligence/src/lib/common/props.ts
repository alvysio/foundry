import { aiProps } from '@activepieces/piece-ai';

/**
 * Provider + model dropdowns for Alvys Intelligence chat actions. Backed by
 * the platform-configured AI Providers in Platform Admin → AI Providers. No
 * own credential surface — the underlying provider (Anthropic, OpenAI,
 * Google, etc.) is selected per-step by the flow author and credentials come
 * from the platform's configured provider.
 */
export const alvysAiProps = aiProps({ modelType: 'text' });
