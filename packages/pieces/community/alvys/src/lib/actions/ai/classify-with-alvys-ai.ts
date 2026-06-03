import { createAction, Property } from '@activepieces/pieces-framework';
import { AIProviderName } from '@activepieces/shared';
import { createAIModel } from '@activepieces/piece-ai';
import { generateText } from 'ai';

import { alvysAuth } from '../../auth';
import { requireTier, tierProperty } from './common';

export const classifyWithAlvysAiAction = createAction({
  auth: alvysAuth,
  name: 'alvys_ai_classify',
  displayName: 'Classify with Alvys AI',
  description:
    'Classify text into one of a set of categories using Alvys Intelligence. Returns the chosen category as a string.',
  props: {
    tier: tierProperty,
    text: Property.LongText({
      displayName: 'Text to Classify',
      required: true,
    }),
    categories: Property.Array({
      displayName: 'Categories',
      description: 'Possible labels (e.g. "spam", "support", "billing").',
      required: true,
    }),
  },
  async run(context) {
    const categories = (context.propsValue.categories as string[]) ?? [];

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
      prompt:
        `As a text classifier, your task is to assign one of the following categories to the provided text: ${categories.join(
          ', ',
        )}. Respond with only the selected category as a single word, nothing else.\nText: "${context.propsValue.text}"`,
    });

    const result = response.text.trim();
    if (!categories.includes(result)) {
      throw new Error('Unable to classify text into the provided categories.');
    }
    return result;
  },
});
