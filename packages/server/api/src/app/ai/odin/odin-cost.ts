import { OdinCost, OdinUsage } from './odin-types'

type Pricing = { inputUsdPerMTok: number, outputUsdPerMTok: number }

const STATIC_PRICING: Record<string, Pricing> = {
    'openai/gpt-4o-mini': { inputUsdPerMTok: 0.15, outputUsdPerMTok: 0.60 },
    'openai/gpt-4o': { inputUsdPerMTok: 2.50, outputUsdPerMTok: 10.00 },
    'openai/o3': { inputUsdPerMTok: 2.00, outputUsdPerMTok: 8.00 },
    'openai/o3-mini': { inputUsdPerMTok: 1.10, outputUsdPerMTok: 4.40 },
    'anthropic/claude-3.5-haiku': { inputUsdPerMTok: 0.80, outputUsdPerMTok: 4.00 },
    'anthropic/claude-3.5-sonnet': { inputUsdPerMTok: 3.00, outputUsdPerMTok: 15.00 },
    'anthropic/claude-opus-4.1': { inputUsdPerMTok: 15.00, outputUsdPerMTok: 75.00 },
    'google/gemini-flash-1.5': { inputUsdPerMTok: 0.075, outputUsdPerMTok: 0.30 },
    'google/gemini-pro-1.5': { inputUsdPerMTok: 1.25, outputUsdPerMTok: 5.00 },
}

export function lookupPricing(modelId: string): Pricing | null {
    return STATIC_PRICING[modelId] ?? null
}

export function computeCost(modelId: string, usage: OdinUsage): OdinCost {
    const price = lookupPricing(modelId)
    if (price === null) {
        return { inputUsd: 0, outputUsd: 0, totalUsd: 0 }
    }
    const inputUsd = (usage.inputTokens / 1_000_000) * price.inputUsdPerMTok
    const outputUsd = (usage.outputTokens / 1_000_000) * price.outputUsdPerMTok
    return { inputUsd, outputUsd, totalUsd: inputUsd + outputUsd }
}

export const odinCost = { lookupPricing, computeCost }
