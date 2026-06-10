import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';
import { agentDropdown } from '../../common/props';

export const updateAgent = createAction({
  auth: alvysVoiceAuth,
  name: 'update_voice_agent',
  displayName: 'Update Voice Agent',
  description: 'Apply a delta update to an existing voice agent.',
  props: {
    agentId: agentDropdown('Agent to update.'),
    name: Property.ShortText({ displayName: 'New Name', required: false }),
    systemPrompt: Property.LongText({ displayName: 'New System Prompt', required: false }),
    firstMessage: Property.LongText({ displayName: 'New First Message', required: false }),
    advancedConfig: Property.Json({
      displayName: 'Conversation Config Delta (Optional)',
      description: 'Raw delta object merged into the agent config.',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);

    const conversationConfig: Record<string, unknown> = {};
    const agent: Record<string, unknown> = {};
    const prompt: Record<string, unknown> = {};

    if (propsValue.systemPrompt?.trim()) {
      prompt['prompt'] = propsValue.systemPrompt.trim();
    }
    if (Object.keys(prompt).length > 0) {
      agent['prompt'] = prompt;
    }
    if (propsValue.firstMessage?.trim()) {
      agent['firstMessage'] = propsValue.firstMessage.trim();
    }
    if (Object.keys(agent).length > 0) {
      conversationConfig['agent'] = agent;
    }

    const merged = {
      ...conversationConfig,
      ...(propsValue.advancedConfig ?? {}),
    };

    const response = await client.conversationalAi.agents.update(propsValue.agentId, {
      name: propsValue.name?.trim() || undefined,
      conversationConfig: Object.keys(merged).length > 0 ? (merged as never) : undefined,
    });
    return response;
  },
});
