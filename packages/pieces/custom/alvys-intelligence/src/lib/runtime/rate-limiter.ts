/**
 * Sliding-window rate limiter keyed by tenant + operation.
 *
 * Ported from `@alvysio/odin` `packages/@odin/shared/src/resilience/rate-limiter.ts`.
 * State lives in `context.store` so the same tenant burning quota in one step run
 * is reflected in the next.
 *
 * Default policy: 60 requests / 60s window.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAtEpochMs: number;
  retryAfterMs: number;
  total: number;
};

export type RateLimiterConfig = {
  maxRequests: number;
  windowMs: number;
};

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRequests: 60,
  windowMs: 60_000,
};

type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

type WindowEntry = {
  timestampsEpochMs: number[];
};

function pruneWindow(timestamps: number[], cutoffEpochMs: number): number[] {
  return timestamps.filter((t) => t > cutoffEpochMs);
}

export const rateLimiter = {
  async checkAndIncrement(params: {
    store: StoreLike;
    storeKey: string;
    config?: Partial<RateLimiterConfig>;
    nowEpochMs?: number;
  }): Promise<RateLimitResult> {
    const cfg = { ...DEFAULT_CONFIG, ...(params.config ?? {}) };
    const now = params.nowEpochMs ?? Date.now();
    const cutoff = now - cfg.windowMs;

    const existing = (await params.store.get<WindowEntry>(params.storeKey)) ?? { timestampsEpochMs: [] };
    const pruned = pruneWindow(existing.timestampsEpochMs, cutoff);

    if (pruned.length >= cfg.maxRequests) {
      const oldest = pruned[0];
      const resetAtEpochMs = oldest + cfg.windowMs;
      await params.store.put<WindowEntry>(params.storeKey, { timestampsEpochMs: pruned });
      return {
        allowed: false,
        remaining: 0,
        resetAtEpochMs,
        retryAfterMs: Math.max(0, resetAtEpochMs - now),
        total: pruned.length,
      };
    }

    const updated = [...pruned, now];
    await params.store.put<WindowEntry>(params.storeKey, { timestampsEpochMs: updated });
    return {
      allowed: true,
      remaining: cfg.maxRequests - updated.length,
      resetAtEpochMs: now + cfg.windowMs,
      retryAfterMs: 0,
      total: updated.length,
    };
  },
};
