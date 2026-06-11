import { circuitBreaker } from '../../runtime/circuit-breaker';
import { rateLimiter } from '../../runtime/rate-limiter';
import {
  resolveEffectiveConfig,
  readConnectionConfigOverrides,
  EffectiveConfig,
} from '../../runtime/effective-config';
import { readAuthProps, AlvysIntelligenceAuthProps } from '../../runtime/key-mapping';
import { bemProvider } from '../../runtime/providers/bem';
import { readStepAdvanced } from './advanced-prop';

type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
  delete: (key: string) => Promise<void>;
};

/**
 * Shared pre-flight for every BEM-backed document action: credential checks,
 * layered config resolution, per-project sliding-window rate limit, and the
 * shared document circuit breaker. Returns everything the action needs to
 * issue the BEM call plus the breaker bookkeeping helpers.
 */
async function begin({
  rawAuth,
  store,
  apiUrl,
  serverToken,
  projectId,
  advanced,
  rateKeySuffix,
  unavailableMessage,
}: {
  rawAuth: unknown;
  store: StoreLike;
  apiUrl: string;
  serverToken: string;
  projectId: string;
  advanced: unknown;
  rateKeySuffix: string;
  unavailableMessage: string;
}): Promise<DocumentCallContext> {
  const auth = readAuthProps(rawAuth);
  if (!auth.documentKey) {
    throw new Error('Document Intelligence Key is not configured on the Alvys Intelligence connection.');
  }

  const config = await resolveEffectiveConfig({
    store,
    apiUrl,
    serverToken,
    connectionConfig: readConnectionConfigOverrides(rawAuth),
    stepConfig: readStepAdvanced(advanced),
  });

  const rl = await rateLimiter.checkAndIncrement({
    store,
    storeKey: `alvys.intelligence.${projectId}.rl.${rateKeySuffix}`,
    config: { maxRequests: config.rateLimitMaxRequests, windowMs: config.rateLimitWindowSec * 1000 },
  });
  if (!rl.allowed) {
    throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
  }

  const breakerKey = `alvys.intelligence.${projectId}.cb.document`;
  const breakerConfig = {
    failureThreshold: config.circuitFailureThreshold,
    recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
  };
  const breakerCheck = await circuitBreaker.checkAllowed({ store, storeKey: breakerKey, config: breakerConfig });
  if (!breakerCheck.allowed) {
    throw new Error(unavailableMessage);
  }

  const baseUrl = bemProvider.resolveBaseUrl({
    override: config.documentBaseUrl?.trim() || auth.documentBaseUrl,
    environment: auth.environment,
  });

  return {
    auth,
    config,
    baseUrl,
    apiKey: auth.documentKey,
    rateLimit: { remaining: rl.remaining, total: rl.total },
    recordSuccess: () => circuitBreaker.recordSuccess({ store, storeKey: breakerKey }),
    recordFailure: async () => {
      await circuitBreaker.recordFailure({ store, storeKey: breakerKey, config: breakerConfig });
    },
  };
}

export const documentCall = { begin };

export type DocumentCallContext = {
  auth: AlvysIntelligenceAuthProps;
  config: EffectiveConfig;
  baseUrl: string;
  apiKey: string;
  rateLimit: { remaining: number; total: number };
  recordSuccess: () => Promise<void>;
  recordFailure: () => Promise<void>;
};
