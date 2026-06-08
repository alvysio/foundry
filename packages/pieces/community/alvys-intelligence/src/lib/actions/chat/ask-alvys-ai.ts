import { createAction, Property } from '@activepieces/pieces-framework';
import { alvysIntelligenceAuth } from '../../auth';
import { AlvysTierSchema, SafeStringSchema } from '../../runtime/zod-schemas';
import { orchestrator } from '../../runtime/orchestrator';
import { buildProviderKeyMapForTier, readAuthProps } from '../../runtime/key-mapping';
import { AlvysTier } from '../../runtime/tier-router';

export const askAlvysAi = createAction({
  auth: alvysIntelligenceAuth,
  name: 'ask_alvys_ai',
  displayName: 'Ask Alvys AI',
  description:
    'Run a prompt through Alvys Intelligence with tier-based routing, sliding-window rate limiting, PII redaction, and prompt-injection scanning. All processing happens inside the Activepieces sandbox.',
  props: {
    tier: Property.StaticDropdown<string>({
      displayName: 'Tier',
      description:
        'Pick a capability tier. Alvys Intelligence routes to the best available model under the hood (with fallback). Fast = cheapest, Smart = highest quality, Long Context = large documents.',
      required: true,
      defaultValue: 'alvys-balanced',
      options: {
        options: [
          { label: 'Fast', value: 'alvys-fast' },
          { label: 'Balanced (default)', value: 'alvys-balanced' },
          { label: 'Smart', value: 'alvys-smart' },
          { label: 'Long Context (1M tokens)', value: 'alvys-long-context' },
        ],
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'Your prompt. Sensitive values (credit cards, SSNs, API keys) are redacted before leaving the sandbox.',
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
      defaultValue: 2048,
    }),
    creativity: Property.Number({
      displayName: 'Creativity (0–200)',
      required: false,
      defaultValue: 100,
      description: 'Higher = more creative, lower = more deterministic.',
    }),
  },
  async run(context) {
    const auth = readAuthProps(context.auth);
    const tierResult = AlvysTierSchema.safeParse(context.propsValue.tier);
    if (!tierResult.success) throw new Error('Invalid tier selection.');
    const tier = tierResult.data as AlvysTier;

    const promptResult = SafeStringSchema.safeParse(context.propsValue.prompt);
    if (!promptResult.success) {
      throw new Error('Prompt failed input validation. Remove control characters or shorten input.');
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (context.propsValue.systemPrompt) {
      messages.push({ role: 'system', content: context.propsValue.systemPrompt });
    }
    messages.push({ role: 'user', content: promptResult.data });

    const keys = buildProviderKeyMapForTier({ tier, auth });
    if (Object.keys(keys).length === 0) {
      throw new Error('No chat keys configured on the Alvys Intelligence connection.');
    }

    const result = await orchestrator.chat({
      tier,
      messages,
      maxOutputTokens: context.propsValue.maxOutputTokens ?? 2048,
      temperature: (context.propsValue.creativity ?? 100) / 100,
      ctx: {
        store: context.store,
        tenantKey: context.project.id,
        keys,
      },
    });

    return {
      text: result.response.text,
      tier,
      usage: {
        inputTokens: result.response.inputTokens,
        outputTokens: result.response.outputTokens,
      },
      safety: {
        outboundRedactions: result.safetyFindings.outbound.length,
        promptInjectionsDetected: result.safetyFindings.inbound.length,
      },
      rateLimit: result.rateLimit,
    };
  },
});
