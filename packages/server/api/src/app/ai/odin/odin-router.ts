import { odinCircuitBreaker } from './odin-circuit-breaker'
import { defaultTierMap, TierMap } from './odin-tier-map'
import { ChatMessage, ModelTier, RoutingDecision, RoutingMode } from './odin-types'

const COMPLEXITY_INDICATORS = {
    high: [
        'architect', 'design', 'refactor', 'optimize', 'security', 'audit',
        'complex', 'analyze', 'investigate', 'debug', 'performance', 'scale',
        'distributed', 'concurrent', 'algorithm', 'system', 'integration',
        'reason', 'prove', 'derive', 'step-by-step', 'explain why',
    ],
    medium: [
        'implement', 'feature', 'add', 'update', 'modify', 'fix', 'test',
        'review', 'validate', 'check', 'improve', 'enhance', 'extend',
    ],
    low: [
        'simple', 'typo', 'comment', 'format', 'rename', 'move', 'copy',
        'delete', 'documentation', 'readme', 'config', 'version', 'bump',
    ],
}

const MULTI_FILE_PATTERNS = [
    /multiple files?/i,
    /across.*modules?/i,
    /refactor.*codebase/i,
    /all.*files/i,
    /entire.*project/i,
    /system.*wide/i,
]

const CODEGEN_PATTERNS = [
    /implement/i,
    /create.*feature/i,
    /build.*system/i,
    /design.*api/i,
    /write.*tests/i,
    /add.*functionality/i,
]

const UNCERTAIN_PATTERNS = [
    /not sure/i, /might/i, /maybe/i, /possibly/i, /investigate/i,
    /figure out/i, /unclear/i, /unknown/i, /debug/i, /strange/i,
    /weird/i, /issue/i, /problem/i, /error/i, /bug/i,
]

type ComplexityAnalysis = {
    score: number
    indicators: { high: string[], medium: string[], low: string[] }
    features: { lexicalComplexity: number, semanticDepth: number, taskScope: number, uncertaintyLevel: number }
}

function flattenMessages(messages: ChatMessage[]): string {
    return messages.map(m => `${m.role}: ${m.content}`).join('\n')
}

function computeLexicalComplexity(text: string): number {
    const words = text.split(/\s+/).filter(Boolean)
    const avg = words.reduce((s, w) => s + w.length, 0) / Math.max(1, words.length)
    const lengthScore = Math.min(1, words.length / 200)
    const wordScore = Math.min(1, Math.max(0, (avg - 3) / 7))
    return lengthScore * 0.4 + wordScore * 0.6
}

function computeSemanticDepth(indicators: ComplexityAnalysis['indicators']): number {
    const high = indicators.high.length * 0.3
    const med = indicators.medium.length * 0.15
    const low = indicators.low.length * -0.1
    return Math.min(1, Math.max(0, 0.3 + high + med + low))
}

function computeTaskScope(text: string, words: string[]): number {
    const multi = MULTI_FILE_PATTERNS.some(p => p.test(text)) ? 0.4 : 0
    const code = CODEGEN_PATTERNS.some(p => p.test(text)) ? 0.3 : 0
    const wc = Math.min(0.3, words.length / 200)
    return multi + code + wc
}

function computeUncertaintyLevel(text: string): number {
    const hits = UNCERTAIN_PATTERNS.filter(p => p.test(text)).length
    return Math.min(1, hits * 0.2)
}

export function analyzeComplexity(messages: ChatMessage[]): ComplexityAnalysis {
    const text = flattenMessages(messages)
    const lower = text.toLowerCase()
    const words = lower.split(/\s+/).filter(Boolean)
    const indicators = {
        high: COMPLEXITY_INDICATORS.high.filter(i => lower.includes(i)),
        medium: COMPLEXITY_INDICATORS.medium.filter(i => lower.includes(i)),
        low: COMPLEXITY_INDICATORS.low.filter(i => lower.includes(i)),
    }
    const lex = computeLexicalComplexity(text)
    const sem = computeSemanticDepth(indicators)
    const scope = computeTaskScope(text, words)
    const unc = computeUncertaintyLevel(text)
    const score = Math.min(1, Math.max(0, lex * 0.2 + sem * 0.35 + scope * 0.25 + unc * 0.2))
    return { score, indicators, features: { lexicalComplexity: lex, semanticDepth: sem, taskScope: scope, uncertaintyLevel: unc } }
}

function scoreTiers(complexityScore: number): Record<ModelTier, number> {
    return {
        fast: Math.max(0, 1 - complexityScore * 2),
        balanced: 1 - Math.abs(complexityScore - 0.5) * 2,
        powerful: Math.min(1, complexityScore * 1.5),
    }
}

function tierForMode(mode: RoutingMode, complexity: ComplexityAnalysis): ModelTier {
    if (mode === 'cost') return 'fast'
    if (mode === 'latency') return 'fast'
    if (mode === 'quality') return 'powerful'
    const scores = scoreTiers(complexity.score)
    const tier = (Object.entries(scores) as Array<[ModelTier, number]>).sort((a, b) => b[1] - a[1])[0][0]
    return tier
}

function modelFromTier(map: TierMap, tier: ModelTier): string {
    return map[tier]
}

function providerFromModel(modelId: string): string {
    const slashIdx = modelId.indexOf('/')
    if (slashIdx === -1) return modelId
    return modelId.slice(0, slashIdx)
}

function buildReason(tier: ModelTier, mode: RoutingMode, complexity: ComplexityAnalysis): string {
    const pct = `${(complexity.score * 100).toFixed(0)}%`
    const parts = [`mode=${mode}`, `complexity=${pct}`]
    if (complexity.indicators.high.length > 0) {
        parts.push(`high=${complexity.indicators.high.join(',')}`)
    }
    parts.push(`tier=${tier}`)
    return parts.join(' | ')
}

function withBreakerDegrade(tier: ModelTier, map: TierMap): ModelTier {
    const provider = providerFromModel(map[tier])
    if (!odinCircuitBreaker.isOpen(provider)) return tier
    if (tier === 'fast') return 'balanced'
    if (tier === 'balanced') return 'powerful'
    return tier
}

export function decideRoute({
    messages,
    mode,
    tierMap,
}: {
    messages: ChatMessage[]
    mode: RoutingMode
    tierMap?: TierMap
}): RoutingDecision {
    const map = tierMap ?? defaultTierMap()
    const complexity = analyzeComplexity(messages)
    const initialTier = tierForMode(mode, complexity)
    const tier = withBreakerDegrade(initialTier, map)
    const model = modelFromTier(map, tier)
    const provider = providerFromModel(model)
    const scores = scoreTiers(complexity.score)
    const sorted = (Object.entries(scores) as Array<[ModelTier, number]>).sort((a, b) => b[1] - a[1])
    const bestScore = sorted[0][1]
    const secondScore = sorted[1]?.[1] ?? 0
    const confidence = bestScore > 0 ? Math.min(1, bestScore / (bestScore + secondScore + 0.01)) : 0.5
    const alternatives = sorted.slice(1).map(([t, s]) => ({ tier: t, model: map[t], score: s }))
    return {
        tier,
        provider,
        model,
        confidence,
        reason: buildReason(tier, mode, complexity),
        mode,
        complexityScore: complexity.score,
        alternatives,
    }
}

export const odinRouter = { decideRoute, analyzeComplexity }
