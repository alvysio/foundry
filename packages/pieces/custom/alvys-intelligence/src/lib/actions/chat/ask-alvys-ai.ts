import { createAction, Property } from '@activepieces/pieces-framework';
import { ModelMessage } from 'ai';
import { AIProviderName } from '@activepieces/shared';
import { buildWebSearchConfig, buildWebSearchOptionsProperty } from '@activepieces/piece-ai';

import { alvysIntelligenceAuth } from '../../auth';
import { alvysAiProps } from '../../common/props';
import { safeGenerate } from '../../common/safe-text';
import { advancedProp } from '../common/advanced-prop';

type ConversationCache = ModelMessage[];

export const askAlvysAi = createAction({
  auth: alvysIntelligenceAuth,
  name: 'ask_alvys_ai',
  displayName: 'Ask Alvys AI',
  description:
    'Run a prompt through the platform-configured AI Provider with Alvys Intelligence safety policy, rate limiting, and circuit-breaker resilience.',
  props: {
    provider: alvysAiProps.provider,
    model: alvysAiProps.model,
    prompt: Property.LongText({
      displayName: 'Prompt',
      description:
        'Your prompt. Sensitive values are redacted per the active safety policy before leaving the sandbox.',
      required: true,
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      required: false,
    }),
    conversationKey: Property.ShortText({
      displayName: 'Conversation Key',
      description:
        'When set, prior turns load from the project store and the response is appended back.',
      required: false,
    }),
    maxOutputTokens: Property.Number({
      displayName: 'Max Output Tokens',
      required: false,
      defaultValue: 2048,
    }),
    creativity: Property.Number({
      displayName: 'Creativity',
      description: '0–100. Higher = more creative, lower = more deterministic.',
      required: false,
      defaultValue: 100,
    }),
    webSearch: Property.Checkbox({
      displayName: 'Web Search',
      required: false,
      defaultValue: false,
    }),
    webSearchOptions: buildWebSearchOptionsProperty(
      (propsValue) => ({
        provider: propsValue['provider'] as string | undefined,
        model: propsValue['model'] as string | undefined,
      }),
      ['webSearch', 'provider', 'model'],
      { showIncludeSources: true },
    ),
    advanced: advancedProp,
  },
  async run(context) {
    const conversationKey = context.propsValue.conversationKey
      ? `alvys-intel-conversation:${context.propsValue.conversationKey}`
      : null;

    const conversation: ConversationCache =
      (conversationKey ? await context.store.get<ConversationCache>(conversationKey) : null) ?? [];

    const messages: ModelMessage[] = [];
    if (context.propsValue.systemPrompt) {
      messages.push({ role: 'system', content: context.propsValue.systemPrompt });
    }
    messages.push(...conversation);
    messages.push({ role: 'user', content: context.propsValue.prompt });

    const webSearchEnabled = !!context.propsValue.webSearch;
    const webSearchOptions = (context.propsValue.webSearchOptions ?? {}) as Record<string, unknown>;
    const provider = context.propsValue.provider as AIProviderName;

    const { tools, providerOptions } = buildWebSearchConfig({
      provider,
      model: context.propsValue.model,
      webSearchEnabled,
      webSearchOptions: webSearchOptions as never,
    });

    const result = await safeGenerate({
      context,
      provider,
      modelId: context.propsValue.model,
      messages,
      maxOutputTokens: context.propsValue.maxOutputTokens ?? 2048,
      temperature: (context.propsValue.creativity ?? 100) / 100,
      bucketKey: 'chat',
      tools,
      providerOptions,
      maxToolSteps: tools ? Number(webSearchOptions['maxUses'] ?? 5) : undefined,
    });

    if (conversationKey) {
      const next = [
        ...conversation,
        { role: 'user' as const, content: context.propsValue.prompt },
        { role: 'assistant' as const, content: result.text },
      ];
      await context.store.put(conversationKey, next);
    }

    const includeSources = !!webSearchOptions['includeSources'];
    if (!includeSources) {
      return { ...result, sources: undefined };
    }
    return result;
  },
});
