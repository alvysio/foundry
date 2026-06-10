import { createAction, Property } from '@activepieces/pieces-framework';
import { AIProviderName } from '@activepieces/shared';

import { alvysIntelligenceAuth } from '../../auth';
import { alvysAiProps } from '../../common/props';
import { safeGenerate } from '../../common/safe-text';
import { advancedProp } from '../common/advanced-prop';

export const classifyText = createAction({
  auth: alvysIntelligenceAuth,
  name: 'classify_text',
  displayName: 'Classify Text',
  description:
    'Categorize any text input using custom labels, so your flow knows what to do next.',
  props: {
    provider: alvysAiProps.provider,
    model: alvysAiProps.model,
    text: Property.LongText({
      displayName: 'Text to Classify',
      required: true,
    }),
    categories: Property.Array({
      displayName: 'Categories',
      description: 'Categories to classify text into.',
      required: true,
    }),
    advanced: advancedProp,
  },
  async run(context) {
    const categories = (context.propsValue.categories as string[]) ?? [];

    const result = await safeGenerate({
      context,
      provider: context.propsValue.provider as AIProviderName,
      modelId: context.propsValue.model,
      messages: [
        {
          role: 'user',
          content: `As a text classifier, your task is to assign exactly one of the following categories to the provided text: ${categories.join(
            ', ',
          )}. Respond with only the selected category as a single word, and nothing else.\n\nText to classify: "${context.propsValue.text}"`,
        },
      ],
      maxOutputTokens: 32,
      temperature: 0,
      bucketKey: 'classify',
    });

    const picked = result.text.trim();
    if (!categories.includes(picked)) {
      throw new Error(
        `Model returned a category that is not in the allowed list. Returned: "${picked}". Allowed: ${categories.join(', ')}.`,
      );
    }

    return {
      category: picked,
      safety: result.safety,
      rateLimit: result.rateLimit,
      effectiveConfigSummary: result.effectiveConfigSummary,
    };
  },
});
