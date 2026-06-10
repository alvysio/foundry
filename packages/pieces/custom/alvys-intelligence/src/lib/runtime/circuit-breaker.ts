/**
 * Per-tenant circuit breaker for upstream model calls.
 *
 * Ported from `@alvysio/odin` `packages/@odin/providers/src/base-provider.ts`.
 * State persists in the piece `context.store` keyed by `<vendor>:<env>:<tenantHash>`
 * so successive Activepieces step runs share a breaker view of the upstream.
 *
 * Three states:
 *   `closed`    — normal traffic, count failures.
 *   `open`      — refuse all traffic until `recoveryAtEpochMs`.
 *   `half-open` — let one trial through; one success → closed, one failure → open again.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export type CircuitBreakerSnapshot = {
  state: CircuitState;
  failures: number;
  lastFailureEpochMs: number;
  recoveryAtEpochMs: number;
};

export type CircuitBreakerConfig = {
  failureThreshold: number;
  recoveryWindowMs: number;
};

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryWindowMs: 30_000,
};

type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

function freshSnapshot(): CircuitBreakerSnapshot {
  return {
    state: 'closed',
    failures: 0,
    lastFailureEpochMs: 0,
    recoveryAtEpochMs: 0,
  };
}

async function loadSnapshot(store: StoreLike, key: string): Promise<CircuitBreakerSnapshot> {
  const existing = await store.get<CircuitBreakerSnapshot>(key);
  return existing ?? freshSnapshot();
}

export const circuitBreaker = {
  /**
   * Check whether a new request is allowed under the current state.
   * If the breaker is `open` but the recovery window has elapsed, transitions to `half-open`.
   */
  async checkAllowed(params: {
    store: StoreLike;
    storeKey: string;
    config?: Partial<CircuitBreakerConfig>;
    nowEpochMs?: number;
  }): Promise<{ allowed: boolean; snapshot: CircuitBreakerSnapshot }> {
    const cfg = { ...DEFAULT_CONFIG, ...(params.config ?? {}) };
    const now = params.nowEpochMs ?? Date.now();
    const snapshot = await loadSnapshot(params.store, params.storeKey);

    if (snapshot.state === 'open' && now >= snapshot.recoveryAtEpochMs) {
      const halfOpen: CircuitBreakerSnapshot = { ...snapshot, state: 'half-open' };
      await params.store.put(params.storeKey, halfOpen);
      return { allowed: true, snapshot: halfOpen };
    }

    if (snapshot.state === 'open') {
      return { allowed: false, snapshot };
    }

    void cfg;
    return { allowed: true, snapshot };
  },

  async recordSuccess(params: { store: StoreLike; storeKey: string }): Promise<void> {
    await params.store.put(params.storeKey, freshSnapshot());
  },

  async recordFailure(params: {
    store: StoreLike;
    storeKey: string;
    config?: Partial<CircuitBreakerConfig>;
    nowEpochMs?: number;
  }): Promise<CircuitBreakerSnapshot> {
    const cfg = { ...DEFAULT_CONFIG, ...(params.config ?? {}) };
    const now = params.nowEpochMs ?? Date.now();
    const snapshot = await loadSnapshot(params.store, params.storeKey);
    const failures = snapshot.failures + 1;
    const next: CircuitBreakerSnapshot = failures >= cfg.failureThreshold
      ? {
          state: 'open',
          failures,
          lastFailureEpochMs: now,
          recoveryAtEpochMs: now + cfg.recoveryWindowMs,
        }
      : {
          ...snapshot,
          failures,
          lastFailureEpochMs: now,
        };
    await params.store.put(params.storeKey, next);
    return next;
  },
};
