import { z } from 'zod'

export const ModelTier = z.enum(['fast', 'balanced', 'powerful'])
export type ModelTier = z.infer<typeof ModelTier>

export const RoutingMode = z.enum(['auto', 'cost', 'quality', 'latency'])
export type RoutingMode = z.infer<typeof RoutingMode>

export const ChatRole = z.enum(['system', 'user', 'assistant', 'tool'])
export type ChatRole = z.infer<typeof ChatRole>

export const ChatMessage = z.object({
    role: ChatRole,
    content: z.string().min(1),
})
export type ChatMessage = z.infer<typeof ChatMessage>

export const SafetyFinding = z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    length: z.number().int().min(0),
})
export type SafetyFinding = z.infer<typeof SafetyFinding>

export const SafetyReport = z.object({
    blocked: z.boolean(),
    redactedText: z.string(),
    findings: z.array(SafetyFinding),
})
export type SafetyReport = z.infer<typeof SafetyReport>

export const RoutingDecision = z.object({
    tier: ModelTier,
    provider: z.string(),
    model: z.string(),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    mode: RoutingMode,
    complexityScore: z.number().min(0).max(1),
    alternatives: z.array(z.object({ tier: ModelTier, model: z.string(), score: z.number() })),
})
export type RoutingDecision = z.infer<typeof RoutingDecision>

export const OdinRouteRequest = z.object({
    messages: z.array(ChatMessage).min(1).max(200),
    mode: RoutingMode.optional().default('auto'),
})
export type OdinRouteRequest = z.infer<typeof OdinRouteRequest>

export const OdinChatRequest = z.object({
    messages: z.array(ChatMessage).min(1).max(200),
    model: z.string().optional(),
    mode: RoutingMode.optional().default('auto'),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().min(1).max(32_000).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
})
export type OdinChatRequest = z.infer<typeof OdinChatRequest>

export const OdinUsage = z.object({
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
    totalTokens: z.number().int().min(0),
})
export type OdinUsage = z.infer<typeof OdinUsage>

export const OdinCost = z.object({
    inputUsd: z.number().min(0),
    outputUsd: z.number().min(0),
    totalUsd: z.number().min(0),
})
export type OdinCost = z.infer<typeof OdinCost>

export const OdinChatResponse = z.object({
    id: z.string(),
    choices: z.array(z.object({
        index: z.number().int(),
        message: ChatMessage,
        finishReason: z.string().nullable(),
    })),
    usage: OdinUsage,
    odin: z.object({
        decision: RoutingDecision,
        safety: z.object({
            input: SafetyReport,
            output: SafetyReport,
        }),
        cost: OdinCost,
    }),
})
export type OdinChatResponse = z.infer<typeof OdinChatResponse>

export const OdinModelEntry = z.object({
    id: z.string(),
    displayName: z.string(),
    tier: ModelTier.nullable(),
    provider: z.string(),
    capabilities: z.array(z.string()),
    pricing: z.object({
        inputUsdPerMTok: z.number().min(0).nullable(),
        outputUsdPerMTok: z.number().min(0).nullable(),
    }),
})
export type OdinModelEntry = z.infer<typeof OdinModelEntry>

export const OdinModelsResponse = z.object({
    auto: z.object({
        id: z.literal('auto'),
        displayName: z.string(),
        tiers: z.record(ModelTier, z.string()),
    }),
    models: z.array(OdinModelEntry),
})
export type OdinModelsResponse = z.infer<typeof OdinModelsResponse>
