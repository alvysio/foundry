import { ModelTier } from './odin-types'

export type TierMap = Record<ModelTier, string>

const DEFAULT_TIER_MAP: TierMap = {
    fast: process.env.ODIN_TIER_FAST ?? 'openai/gpt-4o-mini',
    balanced: process.env.ODIN_TIER_BALANCED ?? 'anthropic/claude-3.5-sonnet',
    powerful: process.env.ODIN_TIER_POWERFUL ?? 'anthropic/claude-opus-4.1',
}

export function defaultTierMap(): TierMap {
    return { ...DEFAULT_TIER_MAP }
}

export function resolveTier(modelId: string, map: TierMap): ModelTier | null {
    const entries = Object.entries(map) as Array<[ModelTier, string]>
    const hit = entries.find(([, m]) => m === modelId)
    return hit?.[0] ?? null
}

export const odinTierMap = {
    default: defaultTierMap,
    resolveTier,
}
