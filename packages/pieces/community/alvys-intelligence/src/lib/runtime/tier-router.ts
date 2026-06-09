/**
 * Tier → vendor-model mapping.
 *
 * The four Alvys-branded tiers map to specific upstream model IDs internally;
 * the mapping is the ONLY place a vendor name appears in piece source. Callers
 * pass the Alvys tier; the router returns a `RouteDecision` containing the
 * concrete provider + model id to call. The provider name MUST be passed
 * straight to provider modules and never surfaced to the AP flow author.
 *
 * Ordered fallback chain per tier (primary + 2 fallbacks) follows the
 * `@alvysio/odin` pattern in `packages/@odin/providers/src/cli-router.ts`.
 */

export type AlvysTier = 'alvys-fast' | 'alvys-balanced' | 'alvys-smart' | 'alvys-long-context';

export type VendorProvider = 'anthropic' | 'openai' | 'gemini' | 'document-intel';

export type RouteCandidate = {
  provider: VendorProvider;
  modelId: string;
};

export type RouteDecision = {
  tier: AlvysTier;
  primary: RouteCandidate;
  fallbacks: RouteCandidate[];
};

const TIER_ROUTING: Record<AlvysTier, RouteCandidate[]> = {
  'alvys-fast': [
    { provider: 'gemini', modelId: 'gemini-2.5-flash' },
    { provider: 'anthropic', modelId: 'claude-haiku-4-5' },
    { provider: 'openai', modelId: 'gpt-5-mini' },
  ],
  'alvys-balanced': [
    { provider: 'anthropic', modelId: 'claude-sonnet-4-5' },
    { provider: 'openai', modelId: 'gpt-5' },
    { provider: 'gemini', modelId: 'gemini-2.5-pro' },
  ],
  'alvys-smart': [
    { provider: 'anthropic', modelId: 'claude-opus-4-5' },
    { provider: 'openai', modelId: 'gpt-5-pro' },
    { provider: 'gemini', modelId: 'gemini-2.5-pro' },
  ],
  'alvys-long-context': [
    { provider: 'gemini', modelId: 'gemini-2.5-pro' },
    { provider: 'anthropic', modelId: 'claude-sonnet-4-5' },
    { provider: 'openai', modelId: 'gpt-5' },
  ],
};

export const tierRouter = {
  route(tier: AlvysTier): RouteDecision {
    const candidates = TIER_ROUTING[tier];
    if (!candidates || candidates.length === 0) {
      throw new Error(`Unknown Alvys tier: ${tier}`);
    }
    return {
      tier,
      primary: candidates[0],
      fallbacks: candidates.slice(1),
    };
  },

  routeDocumentExtraction(): RouteCandidate {
    return { provider: 'document-intel', modelId: 'document-extract-v1' };
  },
};
