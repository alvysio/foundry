/**
 * Request orchestrator — assembles circuit breaker + rate limiter + safety
 * pipeline + tier routing + provider call into a single function per request.
 *
 * Layer order on the outbound side:
 *   1. Validate inputs (Zod)
 *   2. Rate-limit check (per tenant + operation)
 *   3. Safety redact outbound text
 *   4. Tier router → primary + fallbacks
 *   5. Circuit-breaker check for primary
 *   6. Provider call (with fallback on failure)
 *   7. Record success/failure to breaker
 *
 * Layer order on the inbound side:
 *   1. Prompt-injection scan
 *   2. Map to Alvys-shaped response (caller does this — the orchestrator returns
 *      the raw normalized provider response since the action knows the field
 *      conventions)
 */

import { circuitBreaker } from './circuit-breaker';
import { rateLimiter } from './rate-limiter';
import { safety } from './safety';
import { tierRouter, AlvysTier, RouteCandidate } from './tier-router';
import {
  callChatProvider,
  ChatRequest,
  ChatResponse,
  ProviderKeyMap,
} from './providers';

type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

export type OrchestrationContext = {
  store: StoreLike;
  tenantKey: string;
  keys: ProviderKeyMap;
};

export type OrchestratedChatResult = {
  response: ChatResponse;
  modelUsed: { providerInternal: string; modelIdInternal: string };
  safetyFindings: { outbound: ReturnType<typeof safety.redactOutbound>['findings']; inbound: ReturnType<typeof safety.scanInboundForInjection> };
  rateLimit: { remaining: number; total: number };
};

function storeKey(tenantKey: string, suffix: string): string {
  return `alvys.intelligence.${tenantKey}.${suffix}`;
}

async function attemptCandidate(params: {
  candidate: RouteCandidate;
  request: ChatRequest;
  ctx: OrchestrationContext;
  reason: 'primary' | 'fallback';
}): Promise<ChatResponse | null> {
  const breakerKey = storeKey(params.ctx.tenantKey, `cb.${params.candidate.provider}`);
  const check = await circuitBreaker.checkAllowed({
    store: params.ctx.store,
    storeKey: breakerKey,
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
    void params.reason;
    return response;
  } catch (err) {
    await circuitBreaker.recordFailure({
      store: params.ctx.store,
      storeKey: breakerKey,
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
    const rl = await rateLimiter.checkAndIncrement({
      store: params.ctx.store,
      storeKey: storeKey(params.ctx.tenantKey, 'rl.chat'),
    });
    if (!rl.allowed) {
      throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
    }

    const outboundFindings: ReturnType<typeof safety.redactOutbound>['findings'] = [];
    const redactedMessages = params.messages.map((m) => {
      const result = safety.redactOutbound(m.content);
      outboundFindings.push(...result.findings);
      return { ...m, content: result.redacted };
    });

    const decision = tierRouter.route(params.tier);
    const candidates = [decision.primary, ...decision.fallbacks];

    let response: ChatResponse | null = null;
    let chosen: RouteCandidate | null = null;
    let lastError: unknown = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
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
          reason: i === 0 ? 'primary' : 'fallback',
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

    const inboundFindings = safety.scanInboundForInjection(response.text);

    return {
      response,
      modelUsed: {
        providerInternal: chosen.provider,
        modelIdInternal: chosen.modelId,
      },
      safetyFindings: { outbound: outboundFindings, inbound: inboundFindings },
      rateLimit: { remaining: rl.remaining, total: rl.total },
    };
  },
};
