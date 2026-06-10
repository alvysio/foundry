import { createAction, PieceAuth, Property } from '@activepieces/pieces-framework';

import { alvysIntelligenceAuth } from '../../auth';
import { alvysModelProp } from '../../common/props';
import { safeGenerate } from '../../common/safe-text';
import { advancedProp } from '../common/advanced-prop';

/**
 * Pulls structured fields from free-text input. Text-only — for image/PDF
 * extraction, use the Extract Document action which talks to the document
 * pipeline directly.
 *
 * Field set defined by either:
 *   - Simple mode: list of field name + description pairs (model returns flat object).
 *   - Advanced mode: paste a full JSON Schema; model returns object matching it.
 */
export const extractStructuredData = createAction({
  auth: alvysIntelligenceAuth,
  name: 'extract_structured_data',
  displayName: 'Extract Structured Data',
  description:
    'Pull names, amounts, dates, identifiers, and other structured fields from free-text input.',
  props: {
    model: alvysModelProp,
    text: Property.LongText({
      displayName: 'Text',
      description: 'Text to extract structured data from.',
      required: true,
    }),
    instruction: Property.ShortText({
      displayName: 'Guide Prompt',
      defaultValue: 'Extract the following data from the provided text.',
      required: false,
    }),
    mode: Property.StaticDropdown<'simple' | 'advanced'>({
      displayName: 'Schema Type',
      required: true,
      defaultValue: 'simple',
      options: {
        options: [
          { label: 'Simple — name + description', value: 'simple' },
          { label: 'Advanced — JSON Schema', value: 'advanced' },
        ],
      },
    }),
    schema: Property.DynamicProperties({
      auth: PieceAuth.None(),
      displayName: 'Field Definitions',
      required: true,
      refreshers: ['mode'],
      props: async (propsValue) => {
        const mode = propsValue['mode'] as unknown as 'simple' | 'advanced';
        if (mode === 'advanced') {
          return {
            fields: Property.Json({
              displayName: 'JSON Schema',
              description: 'A JSON Schema defining the object to extract.',
              required: true,
            }),
          };
        }
        return {
          fields: Property.Array({
            displayName: 'Fields',
            required: true,
            properties: {
              name: Property.ShortText({ displayName: 'Field Name', required: true }),
              description: Property.LongText({
                displayName: 'Description',
                description: 'Tell the model what this field is and how to find it.',
                required: true,
              }),
            },
          }),
        };
      },
    }),
    advanced: advancedProp,
  },
  async run(context) {
    const mode = context.propsValue.mode;
    const schemaPart = context.propsValue.schema as { fields: unknown };
    let schemaDescription: string;

    if (mode === 'advanced') {
      schemaDescription = `Return a JSON object that conforms exactly to this JSON Schema:\n${JSON.stringify(
        schemaPart.fields,
        null,
        2,
      )}`;
    } else {
      const fields = (schemaPart.fields as { name: string; description: string }[]) ?? [];
      schemaDescription = `Return a JSON object with exactly these fields. Use null for any field you cannot determine.\n${fields
        .map((f) => `- ${f.name}: ${f.description}`)
        .join('\n')}`;
    }

    const result = await safeGenerate({
      context,
      modelId: context.propsValue.model,
      messages: [
        {
          role: 'user',
          content: `${context.propsValue.instruction ?? 'Extract the following data from the provided text.'}\n\n${schemaDescription}\n\nText:\n${context.propsValue.text}\n\nRespond with only the raw JSON object, no markdown fencing, no commentary.`,
        },
      ],
      maxOutputTokens: 4096,
      temperature: 0,
      bucketKey: 'extract',
    });

    let extracted: unknown;
    try {
      extracted = JSON.parse(result.text);
    } catch {
      throw new Error(`Model did not return valid JSON. Output:\n${result.text}`);
    }

    return {
      data: extracted,
      safety: result.safety,
      rateLimit: result.rateLimit,
      effectiveConfigSummary: result.effectiveConfigSummary,
    };
  },
});
