import { ModelMessage, ToolSet, generateText, stepCountIs } from 'ai';
import { ProviderOptions } from '@ai-sdk/provider-utils';
import { AIProviderName } from '@activepieces/shared';
import { createAIModel } from '@activepieces/piece-ai';

import { rateLimiter } from '../runtime/rate-limiter';
import { circuitBreaker } from '../runtime/circuit-breaker';
import { safety } from '../runtime/safety';
import {
  resolveEffectiveConfig,
  readConnectionConfigOverrides,
  EffectiveConfig,
} from '../runtime/effective-config';
import { readStepAdvanced } from '../actions/common/advanced-prop';

type Store = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

export type SafeGenerateParams = {
  context: {
    auth: unknown;
    propsValue: { advanced?: unknown };
    store: Store;
    project: { id: string };
    server: { apiUrl: string; token: string };
    flows: { current: { id: string } };
    run: { id: string };
  };
  provider: AIProviderName;
  modelId: string | undefined;
  messages: ModelMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  bucketKey?: string;
  tools?: ToolSet;
  providerOptions?: ProviderOptions;
  maxToolSteps?: number;
};

export type SafeGenerateResult = {
  text: string;
  sources?: unknown;
  safety: {
    mode: string;
    outboundRedactions: number;
    promptInjectionsDetected: number;
    promptInjectionAction: string;
    flagged: boolean;
  };
  rateLimit: { remaining: number; total: number };
  effectiveConfigSummary: {
    rateLimitMaxRequests: number;
    rateLimitWindowSec: number;
    circuitFailureThreshold: number;
    circuitRecoveryWindowSec: number;
  };
};

/**
 * Wraps the AP `ai` SDK `generateText` call with the Alvys Intelligence safety
 * pipeline: PII redaction on outbound messages, prompt-injection scan on the
 * model response, sliding-window rate limit per project, and a per-tenant
 * circuit breaker around the underlying provider.
 *
 * Provider is pinned to ALVYS_INTELLIGENCE so the model id must be one of the
 * Alvys tiers (`alvys-fast`, `alvys-balanced`, `alvys-smart`,
 * `alvys-long-context`).
 */
export async function safeGenerate(params: SafeGenerateParams): Promise<SafeGenerateResult> {
  const { context, messages, maxOutputTokens, temperature } = params;
  const modelId = params.modelId;
  if (!modelId) {
    throw new Error('Alvys Intelligence model is required.');
  }

  const config: EffectiveConfig = await resolveEffectiveConfig({
    store: context.store,
    apiUrl: context.server.apiUrl,
    serverToken: context.server.token,
    connectionConfig: readConnectionConfigOverrides(context.auth),
    stepConfig: readStepAdvanced(context.propsValue.advanced),
  });

  const tenantKey = context.project.id;
  const bucket = params.bucketKey ?? 'chat';

  const rl = await rateLimiter.checkAndIncrement({
    store: context.store,
    storeKey: `alvys.intelligence.${tenantKey}.rl.${bucket}`,
    config: {
      maxRequests: config.rateLimitMaxRequests,
      windowMs: config.rateLimitWindowSec * 1000,
    },
  });
  if (!rl.allowed) {
    throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
  }

  const breakerKey = `alvys.intelligence.${tenantKey}.cb.chat`;
  const allowed = await circuitBreaker.checkAllowed({
    store: context.store,
    storeKey: breakerKey,
    config: {
      failureThreshold: config.circuitFailureThreshold,
      recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
    },
  });
  if (!allowed.allowed) {
    throw new Error('Alvys Intelligence is temporarily unavailable. Retry shortly.');
  }

  let outboundRedactions = 0;
  const redactedMessages: ModelMessage[] = messages.map((m) => {
    if (typeof m.content !== 'string') return m;
    if (config.safetyMode === 'off') return m;
    const { redacted, findings } = safety.redactOutbound(m.content);
    outboundRedactions += findings.length;
    return { ...m, content: redacted } as ModelMessage;
  });

  try {
    const model = await createAIModel({
      provider: params.provider,
      modelId,
      engineToken: context.server.token,
      apiUrl: context.server.apiUrl,
      projectId: context.project.id,
      flowId: context.flows.current.id,
      runId: context.run.id,
    });

    const response = await generateText({
      model,
      messages: redactedMessages,
      maxOutputTokens,
      temperature,
      tools: params.tools,
      providerOptions: params.providerOptions,
      stopWhen: params.tools && params.maxToolSteps ? stepCountIs(params.maxToolSteps) : undefined,
    });

    await circuitBreaker.recordSuccess({ store: context.store, storeKey: breakerKey });

    let outboundText = response.text ?? '';
    let flagged = false;
    let injections = 0;
    if (config.safetyMode !== 'off') {
      const findings = safety.scanInboundForInjection(outboundText);
      injections = findings.length;
      if (findings.length > 0) {
        if (config.promptInjectionAction === 'block') {
          outboundText = '[blocked: prompt-injection detected]';
          flagged = true;
        } else if (config.promptInjectionAction === 'warn') {
          flagged = true;
        }
      }
    }

    return {
      text: outboundText,
      sources: response.sources,
      safety: {
        mode: config.safetyMode,
        outboundRedactions,
        promptInjectionsDetected: injections,
        promptInjectionAction: config.promptInjectionAction,
        flagged,
      },
      rateLimit: { remaining: rl.remaining, total: rl.total },
      effectiveConfigSummary: {
        rateLimitMaxRequests: config.rateLimitMaxRequests,
        rateLimitWindowSec: config.rateLimitWindowSec,
        circuitFailureThreshold: config.circuitFailureThreshold,
        circuitRecoveryWindowSec: config.circuitRecoveryWindowSec,
      },
    };
  } catch (err) {
    await circuitBreaker.recordFailure({
      store: context.store,
      storeKey: breakerKey,
      config: {
        failureThreshold: config.circuitFailureThreshold,
        recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
      },
    });
    throw err;
  }
}
