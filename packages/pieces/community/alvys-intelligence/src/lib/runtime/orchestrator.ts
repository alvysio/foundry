/**
 * Request orchestrator — applies layered policy (platform → connection →
 * step) at request time.
 *
 * Layer order on the outbound side:
 *   1. Validate inputs (Zod)
 *   2. Rate-limit check (per tenant + operation, config-driven)
 *   3. Safety redact outbound text (config-driven)
 *   4. Tier router → primary + fallbacks
 *   5. Circuit-breaker check for each candidate (config-driven thresholds)
 *   6. Provider call (with fallback on failure)
 *   7. Record success/failure to breaker
 *
 * Layer order on the inbound side:
 *   1. Prompt-injection scan
 *   2. Apply `promptInjectionAction` (block / warn / ignore)
 */

import { circuitBreaker } from './circuit-breaker';
import { rateLimiter } from './rate-limiter';
import { safety, SafetyFinding } from './safety';
import { tierRouter, AlvysTier, RouteCandidate } from './tier-router';
import {
  callChatProvider,
  ChatRequest,
  ChatResponse,
  ProviderKeyMap,
} from './providers';
import { EffectiveConfig } from './effective-config';

type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

export type OrchestrationContext = {
  store: StoreLike;
  tenantKey: string;
  keys: ProviderKeyMap;
  config: EffectiveConfig;
};

export type OrchestratedChatResult = {
  response: ChatResponse;
  modelUsed: { providerInternal: string; modelIdInternal: string };
  safetyFindings: { outbound: SafetyFinding[]; inbound: SafetyFinding[] };
  rateLimit: { remaining: number; total: number };
  flagged?: { promptInjectionBlocked?: boolean };
};

function storeKey(tenantKey: string, suffix: string): string {
  return `alvys.intelligence.${tenantKey}.${suffix}`;
}

function applyOutboundSafety(input: string, cfg: EffectiveConfig): {
  text: string;
  findings: SafetyFinding[];
} {
  if (cfg.safetyMode === 'off') return { text: input, findings: [] };
  const result = safety.redactOutbound(input);
  const filtered = result.findings.filter((f) => {
    if (f.category === 'pii.cc') return cfg.redactCreditCards;
    if (f.category === 'pii.ssn') return cfg.redactSsn;
    if (f.category === 'pii.api_key') return cfg.redactApiKeys;
    return true;
  });
  return { text: result.redacted, findings: filtered };
}

async function attemptCandidate(params: {
  candidate: RouteCandidate;
  request: ChatRequest;
  ctx: OrchestrationContext;
}): Promise<ChatResponse | null> {
  const breakerKey = storeKey(params.ctx.tenantKey, `cb.${params.candidate.provider}`);
  const check = await circuitBreaker.checkAllowed({
    store: params.ctx.store,
    storeKey: breakerKey,
    config: {
      failureThreshold: params.ctx.config.circuitFailureThreshold,
      recoveryWindowMs: params.ctx.config.circuitRecoveryWindowSec * 1000,
    },
  });
  if (!check.allowed) return null;

  try {
    const response = await callChatProvider({
      provider: params.candidate.provider,
      request: { ...params.request, modelId: params.candidate.modelId },
      keys: params.ctx.keys,
    });
    await circuitBreaker.recordSuccess({
      store: params.ctx.store,
      storeKey: breakerKey,
    });
    return response;
  } catch (err) {
    await circuitBreaker.recordFailure({
      store: params.ctx.store,
      storeKey: breakerKey,
      config: {
        failureThreshold: params.ctx.config.circuitFailureThreshold,
        recoveryWindowMs: params.ctx.config.circuitRecoveryWindowSec * 1000,
      },
    });
    throw err;
  }
}

export const orchestrator = {
  async chat(params: {
    tier: AlvysTier;
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    maxOutputTokens?: number;
    temperature?: number;
    ctx: OrchestrationContext;
  }): Promise<OrchestratedChatResult> {
    const cfg = params.ctx.config;

    const rl = await rateLimiter.checkAndIncrement({
      store: params.ctx.store,
      storeKey: storeKey(params.ctx.tenantKey, 'rl.chat'),
      config: {
        maxRequests: cfg.rateLimitMaxRequests,
        windowMs: cfg.rateLimitWindowSec * 1000,
      },
    });
    if (!rl.allowed) {
      throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
    }

    const outboundFindings: SafetyFinding[] = [];
    const redactedMessages = params.messages.map((m) => {
      const result = applyOutboundSafety(m.content, cfg);
      outboundFindings.push(...result.findings);
      return { ...m, content: result.text };
    });

    const decision = tierRouter.route(params.tier);
    const candidates = [decision.primary, ...decision.fallbacks];

    let response: ChatResponse | null = null;
    let chosen: RouteCandidate | null = null;
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        const attempt = await attemptCandidate({
          candidate,
          request: {
            messages: redactedMessages,
            modelId: candidate.modelId,
            maxOutputTokens: params.maxOutputTokens,
            temperature: params.temperature,
          },
          ctx: params.ctx,
        });
        if (attempt) {
          response = attempt;
          chosen = candidate;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!response || !chosen) {
      throw new Error(
        `All Alvys Intelligence model candidates failed for tier "${params.tier}". Last error: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`,
      );
    }

    const inboundFindings: SafetyFinding[] = cfg.safetyMode === 'off'
      ? []
      : safety.scanInboundForInjection(response.text);

    let flagged: { promptInjectionBlocked?: boolean } | undefined;
    if (inboundFindings.length > 0) {
      if (cfg.promptInjectionAction === 'block') {
        flagged = { promptInjectionBlocked: true };
        throw new Error('Response refused — prompt injection detected and safety policy is set to block.');
      }
      if (cfg.promptInjectionAction === 'warn') {
        flagged = { promptInjectionBlocked: false };
      }
    }

    return {
      response,
      modelUsed: {
        providerInternal: chosen.provider,
        modelIdInternal: chosen.modelId,
      },
      safetyFindings: { outbound: outboundFindings, inbound: inboundFindings },
      rateLimit: { remaining: rl.remaining, total: rl.total },
      flagged,
    };
  },
};
