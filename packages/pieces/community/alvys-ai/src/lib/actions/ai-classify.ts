import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysAiAuth } from '../auth';

/**
 * STUB — Alvys AI broker classification primitive.
 * Tracking: https://linear.app/alvys/issue/PLA-137, https://linear.app/alvys/issue/PLA-140
 * Backend route (pending): POST /api/p/v1.0/Ai/classify
 */
export const aiClassifyAction = createAction({
  auth: alvysAiAuth,
  name: 'ai_classify',
  displayName: 'AI Classify',
  description:
    'Classify a piece of text (email, document text, note) into one of N labels. Optimised for cheap, fast routing decisions inside workflows.',
  props: {
    text: Property.LongText({ displayName: 'Text', required: true }),
    labels: Property.Array({
      displayName: 'Labels',
      description: 'The candidate labels (e.g. "RFQ", "Tender", "Spam", "Payment Question").',
      required: true,
    }),
    multiLabel: Property.Checkbox({
      displayName: 'Allow Multiple Labels',
      required: false,
      defaultValue: false,
    }),
    contextEntities: Property.Array({
      displayName: 'Context Entities',
      description: 'Optional Alvys entity refs the broker may hydrate into context.',
      required: false,
    }),
  },
  async run() {
    throw new Error(
      'Not yet implemented (PLA-137). Awaiting Alvys AI broker rollout: POST /api/p/v1.0/Ai/classify. Track progress at https://linear.app/alvys/issue/PLA-137.',
    );
  },
});
