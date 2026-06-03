import { createAction, Property } from '@activepieces/pieces-framework';
import { AIProviderName } from '@activepieces/shared';
import { createAIModel } from '@activepieces/piece-ai';
import { generateText, jsonSchema, tool } from 'ai';

import { alvysAuth } from '../../auth';
import { requireTier, tierProperty } from './common';

export const extractStructuredDataWithAlvysAiAction = createAction({
  auth: alvysAuth,
  name: 'alvys_ai_extract_structured_data',
  displayName: 'Extract Structured Data with Alvys AI',
  description:
    'Extract a structured record from free text using Alvys Intelligence. Provide a JSON Schema describing the fields you need; the AI returns a record that matches it.',
  props: {
    tier: tierProperty,
    text: Property.LongText({
      displayName: 'Text',
      required: true,
    }),
    schema: Property.Json({
      displayName: 'JSON Schema',
      description: 'JSON Schema describing the shape of the data to extract.',
      required: true,
      defaultValue: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
        },
        required: ['name'],
      },
    }),
    guidance: Property.LongText({
      displayName: 'Guidance Prompt',
      required: false,
      defaultValue: 'Extract the structured data described by the schema.',
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

    let captured: unknown = undefined;
    await generateText({
      model,
      prompt: `${context.propsValue.guidance ?? ''}\n\nText:\n${context.propsValue.text}`,
      tools: {
        emit: tool({
          description: 'Emit the extracted record matching the supplied JSON Schema.',
          inputSchema: jsonSchema(context.propsValue.schema as Record<string, unknown>),
          execute: async (input) => {
            captured = input;
            return { ok: true };
          },
        }),
      },
      toolChoice: { type: 'tool', toolName: 'emit' },
    });

    if (captured === undefined) {
      throw new Error('Alvys AI did not return structured data — model declined to emit.');
    }
    return captured;
  },
});
