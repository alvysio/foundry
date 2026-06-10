import { createAction, Property } from '@activepieces/pieces-framework';
import { AIProviderName } from '@activepieces/shared';

import { alvysIntelligenceAuth } from '../../auth';
import { alvysAiProps } from '../../common/props';
import { safeGenerate } from '../../common/safe-text';
import { advancedProp } from '../common/advanced-prop';

export const summarizeText = createAction({
  auth: alvysIntelligenceAuth,
  name: 'summarize_text',
  displayName: 'Summarize Text',
  description: 'Summarize long emails, articles, or documents into what matters.',
  props: {
    provider: alvysAiProps.provider,
    model: alvysAiProps.model,
    text: Property.LongText({ displayName: 'Text', required: true }),
    instruction: Property.ShortText({
      displayName: 'Instruction',
      required: true,
      defaultValue:
        'Summarize the following text in a clear and concise manner, capturing the key points and main ideas while keeping the summary brief and informative.',
    }),
    maxOutputTokens: Property.Number({
      displayName: 'Max Output Tokens',
      required: false,
      defaultValue: 2000,
    }),
    advanced: advancedProp,
  },
  async run(context) {
    return safeGenerate({
      context,
      provider: context.propsValue.provider as AIProviderName,
      modelId: context.propsValue.model,
      messages: [
        {
          role: 'user',
          content: `${context.propsValue.instruction}\n\n${context.propsValue.text}`,
        },
      ],
      maxOutputTokens: context.propsValue.maxOutputTokens ?? 2000,
      bucketKey: 'summarize',
    });
  },
});
