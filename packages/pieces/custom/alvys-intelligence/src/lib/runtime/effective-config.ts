/**
 * Layered configuration resolver.
 *
 * Order of precedence (highest specificity wins):
 *   3. Per-step `advanced` Property.Object on the action
 *   2. Per-connection props on `alvysIntelligenceAuth`
 *   1. Platform AI Provider config (Alvys Intelligence) — fetched from AP API
 *   0. Built-in defaults
 *
 * The platform-level fetch is cached in `context.store` for `PLATFORM_CONFIG_TTL_MS`
 * to keep per-step latency low. Cache invalidates automatically when the TTL elapses.
 */

import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export type SafetyMode = 'strict' | 'permissive' | 'off';
export type PromptInjectionAction = 'block' | 'warn' | 'ignore';

export type EffectiveConfig = {
  rateLimitMaxRequests: number;
  rateLimitWindowSec: number;
  circuitFailureThreshold: number;
  circuitRecoveryWindowSec: number;
  safetyMode: SafetyMode;
  redactCreditCards: boolean;
  redactSsn: boolean;
  redactApiKeys: boolean;
  promptInjectionAction: PromptInjectionAction;
  thinkingBudgetTokens: number;
  documentBaseUrl?: string;
  documentTimeoutMs: number;
};

const DEFAULTS: EffectiveConfig = {
  rateLimitMaxRequests: 60,
  rateLimitWindowSec: 60,
  circuitFailureThreshold: 5,
  circuitRecoveryWindowSec: 30,
  safetyMode: 'strict',
  redactCreditCards: true,
  redactSsn: true,
  redactApiKeys: true,
  promptInjectionAction: 'warn',
  thinkingBudgetTokens: 8000,
  documentTimeoutMs: 90000,
};

const PLATFORM_CONFIG_CACHE_KEY = 'alvys.intelligence.platformConfig';
const PLATFORM_CONFIG_TTL_MS = 5 * 60 * 1000;

type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

type CachedPlatform = {
  fetchedAtEpochMs: number;
  config: Partial<EffectiveConfig>;
};

async function fetchPlatformConfig(params: {
  apiUrl: string;
  serverToken: string;
}): Promise<Partial<EffectiveConfig>> {
  try {
    const res = await httpClient.sendRequest<{ config?: Partial<EffectiveConfig> }>({
      method: HttpMethod.GET,
      url: `${params.apiUrl}v1/ai-providers/alvys-intelligence/config`,
      headers: { Authorization: `Bearer ${params.serverToken}` },
    });
    return res.body?.config ?? {};
  } catch {
    return {};
  }
}

function pickDefined<T extends object>(input: T | undefined | null): Partial<T> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

export async function resolveEffectiveConfig(params: {
  store: StoreLike;
  apiUrl: string;
  serverToken: string;
  connectionConfig?: Partial<EffectiveConfig>;
  stepConfig?: Partial<EffectiveConfig>;
  nowEpochMs?: number;
}): Promise<EffectiveConfig> {
  const now = params.nowEpochMs ?? Date.now();
  const cached = await params.store.get<CachedPlatform>(PLATFORM_CONFIG_CACHE_KEY);
  let platformConfig: Partial<EffectiveConfig>;
  if (cached && now - cached.fetchedAtEpochMs < PLATFORM_CONFIG_TTL_MS) {
    platformConfig = cached.config;
  } else {
    platformConfig = await fetchPlatformConfig({
      apiUrl: params.apiUrl,
      serverToken: params.serverToken,
    });
    await params.store.put<CachedPlatform>(PLATFORM_CONFIG_CACHE_KEY, {
      fetchedAtEpochMs: now,
      config: platformConfig,
    });
  }

  return {
    ...DEFAULTS,
    ...pickDefined(platformConfig),
    ...pickDefined(params.connectionConfig),
    ...pickDefined(params.stepConfig),
  };
}

export function readConnectionConfigOverrides(rawAuth: unknown): Partial<EffectiveConfig> {
  const auth = (rawAuth ?? {}) as Record<string, unknown>;
  const props = (auth['props'] ?? auth) as Record<string, unknown>;
  const override: Partial<EffectiveConfig> = {};
  if (typeof props['rateLimitMaxRequests'] === 'number') override.rateLimitMaxRequests = props['rateLimitMaxRequests'] as number;
  if (typeof props['rateLimitWindowSec'] === 'number') override.rateLimitWindowSec = props['rateLimitWindowSec'] as number;
  if (typeof props['circuitFailureThreshold'] === 'number') override.circuitFailureThreshold = props['circuitFailureThreshold'] as number;
  if (typeof props['circuitRecoveryWindowSec'] === 'number') override.circuitRecoveryWindowSec = props['circuitRecoveryWindowSec'] as number;
  if (typeof props['safetyMode'] === 'string') override.safetyMode = props['safetyMode'] as SafetyMode;
  if (typeof props['redactCreditCards'] === 'boolean') override.redactCreditCards = props['redactCreditCards'] as boolean;
  if (typeof props['redactSsn'] === 'boolean') override.redactSsn = props['redactSsn'] as boolean;
  if (typeof props['redactApiKeys'] === 'boolean') override.redactApiKeys = props['redactApiKeys'] as boolean;
  if (typeof props['promptInjectionAction'] === 'string') override.promptInjectionAction = props['promptInjectionAction'] as PromptInjectionAction;
  if (typeof props['thinkingBudgetTokens'] === 'number') override.thinkingBudgetTokens = props['thinkingBudgetTokens'] as number;
  if (typeof props['documentBaseUrl'] === 'string' && (props['documentBaseUrl'] as string).trim()) override.documentBaseUrl = props['documentBaseUrl'] as string;
  if (typeof props['documentTimeoutMs'] === 'number') override.documentTimeoutMs = props['documentTimeoutMs'] as number;
  return override;
}
