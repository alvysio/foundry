import { createAction, Property } from '@activepieces/pieces-framework';
import { AIProviderName } from '@activepieces/shared';
import { createAIModel } from '@activepieces/piece-ai';
import { generateText } from 'ai';

import { alvysAuth } from '../../auth';
import { requireTier, tierProperty } from './common';

export const askAlvysAiAction = createAction({
  auth: alvysAuth,
  name: 'alvys_ai_ask',
  displayName: 'Ask Alvys AI',
  description:
    'Run a prompt through Alvys Intelligence. Pick a capability tier — Alvys routes to the best underlying model (Anthropic, OpenAI, or Gemini) and applies safety, PII redaction, and usage metering.',
  props: {
    tier: tierProperty,
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      required: false,
      description: 'Optional instruction prepended to every turn.',
    }),
    maxOutputTokens: Property.Number({
      displayName: 'Max Output Tokens',
      required: false,
      defaultValue: 2000,
    }),
    creativity: Property.Number({
      displayName: 'Creativity',
      required: false,
      defaultValue: 100,
      description:
        'Controls how creative the response is. Higher = more creative, lower = more deterministic. Range 0-200.',
    }),
  },
  async run(context) {
    const model = await createAIModel({
      provider: AIProviderName.ALVYS_INTELLIGENCE,
      modelId: requireTier(context.propsValue.tier),
      engineToken: context.server.token,
      apiUrl: context.server.apiUrl,
      projectId: context.project.id,
      flowId: context.flows.current.id,
      runId: context.run.id,
    });

    const response = await generateText({
      model,
      system: context.propsValue.systemPrompt,
      prompt: context.propsValue.prompt,
      maxOutputTokens: context.propsValue.maxOutputTokens ?? 2000,
      temperature: (context.propsValue.creativity ?? 100) / 100,
    });

    return { text: response.text, usage: response.usage };
  },
});
