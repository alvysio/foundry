type BreakerState = {
    consecutiveFailures: number
    lastFailureAt: number | null
}

const DEFAULT_THRESHOLD = 5
const DEFAULT_COOLDOWN_MS = 60_000

const state = new Map<string, BreakerState>()

function ensureState(key: string): BreakerState {
    let cur = state.get(key)
    if (cur === undefined) {
        cur = { consecutiveFailures: 0, lastFailureAt: null }
        state.set(key, cur)
    }
    return cur
}

function recordSuccess(key: string): void {
    const s = ensureState(key)
    s.consecutiveFailures = 0
    s.lastFailureAt = null
}

function recordFailure(key: string): void {
    const s = ensureState(key)
    s.consecutiveFailures += 1
    s.lastFailureAt = Date.now()
}

function isOpen(key: string, opts?: { threshold?: number, cooldownMs?: number }): boolean {
    const threshold = opts?.threshold ?? DEFAULT_THRESHOLD
    const cooldown = opts?.cooldownMs ?? DEFAULT_COOLDOWN_MS
    const s = state.get(key)
    if (!s || s.consecutiveFailures < threshold) return false
    if (s.lastFailureAt === null) return false
    return Date.now() - s.lastFailureAt < cooldown
}

function snapshot(): Record<string, BreakerState> {
    return Object.fromEntries(state.entries())
}

function reset(key?: string): void {
    if (key === undefined) {
        state.clear()
        return
    }
    state.delete(key)
}

export const odinCircuitBreaker = {
    recordSuccess,
    recordFailure,
    isOpen,
    snapshot,
    reset,
}
