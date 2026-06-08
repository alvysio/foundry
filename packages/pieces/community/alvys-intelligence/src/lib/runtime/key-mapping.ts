/**
 * Bridge between the connection's slotted keys (Primary/Secondary/Tertiary)
 * and the per-provider `ProviderKeyMap` the orchestrator + providers consume.
 *
 * The mapping is determined by the tier's fallback chain — slot order
 * (primary → secondary → tertiary) is assigned to the candidate order returned
 * by `tierRouter.route()`. Slots without a matching key cause that candidate
 * to be skipped at call time.
 */

import { ProviderKeyMap } from './providers';
import { tierRouter, AlvysTier } from './tier-router';

export type AlvysAuthProps = {
  environment: string;
  chatPrimaryKey?: string;
  chatSecondaryKey?: string;
  chatTertiaryKey?: string;
  documentKey?: string;
  documentBaseUrl?: string;
};

export function readAuthProps(rawAuth: unknown): AlvysAuthProps {
  const auth = (rawAuth ?? {}) as Record<string, unknown>;
  const props = (auth['props'] ?? auth) as Record<string, unknown>;
  return {
    environment: String(props['environment'] ?? 'production'),
    chatPrimaryKey: props['chatPrimaryKey'] as string | undefined,
    chatSecondaryKey: props['chatSecondaryKey'] as string | undefined,
    chatTertiaryKey: props['chatTertiaryKey'] as string | undefined,
    documentKey: props['documentKey'] as string | undefined,
    documentBaseUrl: props['documentBaseUrl'] as string | undefined,
  };
}

export function buildProviderKeyMapForTier(params: {
  tier: AlvysTier;
  auth: AlvysAuthProps;
}): ProviderKeyMap {
  const decision = tierRouter.route(params.tier);
  const candidates = [decision.primary, ...decision.fallbacks];
  const slotKeys = [
    params.auth.chatPrimaryKey,
    params.auth.chatSecondaryKey,
    params.auth.chatTertiaryKey,
  ];
  const map: ProviderKeyMap = {};
  candidates.forEach((c, i) => {
    const k = slotKeys[i];
    if (k && !map[c.provider]) {
      map[c.provider] = k;
    }
  });
  return map;
}
