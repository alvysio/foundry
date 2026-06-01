import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysAiAuth } from '../auth';

/**
 * STUB — Alvys AI token broker.
 * Tracking: https://linear.app/alvys/issue/PLA-136, https://linear.app/alvys/issue/PLA-140
 *
 * Backend route (pending): POST /api/p/v1.0/Ai/prompt
 * Routes to Anthropic / OpenAI / Gemini server-side. Customer never sees
 * vendor keys. Broker layer adds:
 *   - tenant isolation (CompanyCode pinning)
 *   - prompt-injection scanner
 *   - PII redaction (driver SSN, MC, DOT, license)
 *   - per-tenant rate limit
 *   - audit log entry (Cosmos)
 *   - usage event for Stripe metered billing (5% margin on AI tokens)
 */
export const aiPromptAction = createAction({
  auth: alvysAiAuth,
  name: 'ai_prompt',
  displayName: 'Run AI Prompt',
  description:
    'Send a prompt through the Alvys AI broker. No vendor keys required. The broker chooses the optimal model, redacts PII, scans for prompt injection, and bills per token.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      description: 'Pick by capability. Alvys maps to the underlying vendor.',
      required: true,
      defaultValue: 'alvys-balanced',
      options: {
        options: [
          { label: 'Alvys Fast (low cost, fast latency)', value: 'alvys-fast' },
          { label: 'Alvys Balanced (recommended)', value: 'alvys-balanced' },
          { label: 'Alvys Smart (highest reasoning)', value: 'alvys-smart' },
          { label: 'Alvys Long Context (1M tokens)', value: 'alvys-long-context' },
        ],
      },
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      description: 'Instructions and persona for the model.',
      required: false,
    }),
    userPrompt: Property.LongText({
      displayName: 'User Prompt',
      description: 'The actual task. Reference upstream step outputs with {{ step.field }}.',
      required: true,
    }),
    responseFormat: Property.StaticDropdown({
      displayName: 'Response Format',
      required: false,
      defaultValue: 'text',
      options: {
        options: [
          { label: 'Plain text', value: 'text' },
          { label: 'JSON object', value: 'json' },
        ],
      },
    }),
    jsonSchema: Property.Json({
      displayName: 'JSON Schema',
      description: 'When Response Format = JSON, constrain output to this schema. Optional.',
      required: false,
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      description: '0 = deterministic, 1 = creative. Defaults to 0.2 for ops workflows.',
      required: false,
      defaultValue: 0.2,
    }),
    maxTokens: Property.Number({
      displayName: 'Max Output Tokens',
      required: false,
      defaultValue: 1024,
    }),
    contextEntities: Property.Array({
      displayName: 'Context Entities',
      description:
        'Optional list of Alvys entity refs (e.g. "load:ABC123", "carrier:9912") the broker can hydrate into context. Avoids stuffing the whole record into the prompt.',
      required: false,
    }),
  },
  async run() {
    throw new Error(
      'Not yet implemented (PLA-136). Awaiting Alvys AI broker rollout: POST /api/p/v1.0/Ai/prompt. Track progress at https://linear.app/alvys/issue/PLA-136.',
    );
  },
});
