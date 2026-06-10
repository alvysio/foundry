import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';

/**
 * Creates a new voice agent. Exposes the most common fields directly
 * (systemPrompt, firstMessage, voice, llm); the full underlying agent config
 * can be passed via `advancedConfig` for power users who need fine-grained
 * control over conversation orchestration.
 */
export const createAgent = createAction({
  auth: alvysVoiceAuth,
  name: 'create_voice_agent',
  displayName: 'Create Voice Agent',
  description: 'Provision a new voice agent (system prompt, first message, voice, model).',
  props: {
    name: Property.ShortText({
      displayName: 'Agent Name',
      required: true,
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      description: 'Behavior, persona, and policy for the agent.',
      required: true,
    }),
    firstMessage: Property.LongText({
      displayName: 'First Message',
      description: 'Opening line spoken when a caller connects.',
      required: false,
    }),
    language: Property.ShortText({
      displayName: 'Language Code',
      description: 'ISO language code (e.g. en, es, fr).',
      required: false,
      defaultValue: 'en',
    }),
    voiceId: Property.Dropdown({
      auth: alvysVoiceAuth,
      displayName: 'Voice',
      required: false,
      refreshers: [],
      refreshOnSearch: false,
      options: async ({ auth }) => {
        if (!auth) {
          return { disabled: true, placeholder: 'Connect first.', options: [] };
        }
        try {
          const client = createVoiceClient(auth);
          const response = await client.voices.getAll();
          return {
            disabled: false,
            options: response.voices.map((v) => ({
              label: v.name ?? v.voiceId,
              value: v.voiceId,
            })),
          };
        } catch {
          return { disabled: true, options: [], placeholder: "Couldn't load voices." };
        }
      },
    }),
    llmModel: Property.ShortText({
      displayName: 'LLM Model',
      description: 'Model id used for conversation reasoning (e.g. gpt-4o-mini, claude-3-5-sonnet).',
      required: false,
    }),
    tags: Property.Array({
      displayName: 'Tags',
      required: false,
    }),
    advancedConfig: Property.Json({
      displayName: 'Advanced Conversation Config (Optional)',
      description:
        'Raw conversation config object. Merged into the generated config — keys here override the simple fields above.',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);

    const baseAgent: Record<string, unknown> = {
      prompt: { prompt: propsValue.systemPrompt },
    };
    if (propsValue.llmModel?.trim()) {
      (baseAgent['prompt'] as Record<string, unknown>)['llm'] = propsValue.llmModel.trim();
    }
    if (propsValue.firstMessage?.trim()) {
      baseAgent['firstMessage'] = propsValue.firstMessage.trim();
    }
    if (propsValue.language?.trim()) {
      baseAgent['language'] = propsValue.language.trim();
    }

    const conversationConfig: Record<string, unknown> = {
      agent: baseAgent,
    };
    if (propsValue.voiceId) {
      conversationConfig['tts'] = { voiceId: propsValue.voiceId };
    }
    const merged = {
      ...conversationConfig,
      ...(propsValue.advancedConfig ?? {}),
    };

    const tags = (propsValue.tags ?? []).map((t) => String(t)).filter(Boolean);

    const response = await client.conversationalAi.agents.create({
      name: propsValue.name,
      tags: tags.length > 0 ? tags : undefined,
      conversationConfig: merged as never,
    });
    return response;
  },
});
