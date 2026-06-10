import { chatAiUtils } from '@activepieces/server-utils'
import {
    AIProviderModel,
    AIProviderName,
    apId,
    PlatformId,
} from '@activepieces/shared'
import { generateText, ModelMessage } from 'ai'
import { FastifyBaseLogger } from 'fastify'
import { aiProviderService } from '../ai-provider-service'
import { odinCircuitBreaker } from './odin-circuit-breaker'
import { odinCost } from './odin-cost'
import { OdinSafetyError } from './odin-errors'
import { decideRoute } from './odin-router'
import { guardInput, guardOutput } from './odin-safety'
import { odinTierConfigService } from './odin-tier-config-service'
import { resolveTier } from './odin-tier-map'
import {
    ChatMessage,
    OdinChatRequest,
    OdinChatResponse,
    OdinModelEntry,
    OdinModelsResponse,
    RoutingDecision,
    RoutingMode,
} from './odin-types'

const FINISH_REASON_FALLBACK = 'stop'
const ODIN_AUTO_MODEL_ID = 'auto'

const ALVYS_TIER_ALIAS: Record<string, 'fast' | 'balanced' | 'powerful'> = {
    'alvys-fast': 'fast',
    'alvys-balanced': 'balanced',
    'alvys-smart': 'powerful',
    'alvys-long-context': 'powerful',
}

function resolveExplicitDecision(
    requestedModel: string,
    tierMap: Record<'fast' | 'balanced' | 'powerful', string>,
    mode: RoutingMode,
): RoutingDecision {
    const aliasTier = ALVYS_TIER_ALIAS[requestedModel]
    if (aliasTier !== undefined) {
        const realModel = tierMap[aliasTier]
        return {
            tier: aliasTier,
            provider: providerFromModel(realModel),
            model: realModel,
            confidence: 1,
            reason: `explicit alvys-tier=${requestedModel} → tier=${aliasTier} model=${realModel}`,
            mode,
            complexityScore: 0,
            alternatives: [],
        }
    }
    return {
        tier: resolveTier(requestedModel, tierMap) ?? 'balanced',
        provider: providerFromModel(requestedModel),
        model: requestedModel,
        confidence: 1,
        reason: `explicit model=${requestedModel}`,
        mode,
        complexityScore: 0,
        alternatives: [],
    }
}

function redactMessages(messages: ChatMessage[]): { redacted: ChatMessage[], redactionCount: number } {
    let redactionCount = 0
    const redacted = messages.map(m => {
        const report = guardInput(m.content)
        if (report.findings.length === 0) return m
        redactionCount += report.findings.length
        return { ...m, content: report.redactedText }
    })
    return { redacted, redactionCount }
}

const noopLogger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    trace: () => undefined,
    fatal: () => undefined,
    child: () => noopLogger,
    level: 'info',
} as unknown as FastifyBaseLogger

async function buildModel({
    platformId,
    modelId,
}: {
    platformId: PlatformId
    modelId: string
}) {
    const { config, auth } = await aiProviderService(noopLogger).getConfigOrThrow({
        platformId,
        provider: AIProviderName.CLOUDFLARE_GATEWAY,
    })
    return chatAiUtils.createChatModel({
        provider: AIProviderName.CLOUDFLARE_GATEWAY,
        auth: auth as Record<string, unknown>,
        config: config as Record<string, unknown>,
        modelId,
    })
}

async function route({
    platformId,
    messages,
    mode,
}: {
    platformId: PlatformId
    messages: ChatMessage[]
    mode: RoutingMode
}): Promise<RoutingDecision> {
    const tierMap = await odinTierConfigService.loadTierMap(platformId)
    return decideRoute({ messages, mode, tierMap })
}

async function chat({
    platformId,
    request,
}: {
    platformId: PlatformId
    projectId?: string | null
    principalId?: string | null
    request: OdinChatRequest
}): Promise<OdinChatResponse> {
    const tierMap = await odinTierConfigService.loadTierMap(platformId)

    const inputText = request.messages.map(m => `${m.role}: ${m.content}`).join('\n')
    const inputSafety = guardInput(inputText)
    if (inputSafety.blocked) {
        throw new OdinSafetyError({ stage: 'input', report: inputSafety })
    }

    const decision: RoutingDecision = (request.model !== undefined && request.model !== ODIN_AUTO_MODEL_ID)
        ? resolveExplicitDecision(request.model, tierMap, request.mode)
        : decideRoute({ messages: request.messages, mode: request.mode, tierMap })

    const { redacted: redactedMessages } = redactMessages(request.messages)

    const model = await buildModel({ platformId, modelId: decision.model })

    let result
    try {
        result = await generateText({
            model,
            messages: redactedMessages as ModelMessage[],
            temperature: request.temperature,
            ...(request.maxOutputTokens !== undefined ? { maxOutputTokens: request.maxOutputTokens } : {}),
        })
        odinCircuitBreaker.recordSuccess(decision.provider)
    }
    catch (err) {
        odinCircuitBreaker.recordFailure(decision.provider)
        throw err
    }

    const usage = usageFromResult(result)
    const outputSafety = guardOutput(result.text)
    if (outputSafety.blocked) {
        throw new OdinSafetyError({
            stage: 'output',
            report: outputSafety,
            decision,
            inputSafety,
            usage,
        })
    }

    const cost = odinCost.computeCost(decision.model, usage)
    return {
        id: `odin_${apId()}`,
        choices: [{
            index: 0,
            message: { role: 'assistant', content: outputSafety.redactedText },
            finishReason: result.finishReason ?? FINISH_REASON_FALLBACK,
        }],
        usage,
        odin: {
            decision,
            safety: { input: inputSafety, output: outputSafety },
            cost,
        },
    }
}

function usageFromResult(result: { usage?: { inputTokens?: number, outputTokens?: number, totalTokens?: number } | null }): { inputTokens: number, outputTokens: number, totalTokens: number } {
    const u = result.usage ?? null
    const input = u?.inputTokens ?? 0
    const output = u?.outputTokens ?? 0
    const total = u?.totalTokens ?? input + output
    return { inputTokens: input, outputTokens: output, totalTokens: total }
}

function providerFromModel(modelId: string): string {
    const slashIdx = modelId.indexOf('/')
    if (slashIdx === -1) return modelId
    return modelId.slice(0, slashIdx)
}

function capabilitiesForModel(model: AIProviderModel): string[] {
    return [`type:${model.type}`]
}

async function listModels({ platformId }: { platformId: PlatformId }): Promise<OdinModelsResponse> {
    const tierMap = await odinTierConfigService.loadTierMap(platformId)
    const models = await aiProviderService(noopLogger).listModels(platformId, AIProviderName.CLOUDFLARE_GATEWAY)
    const entries: OdinModelEntry[] = models.map<OdinModelEntry>(m => ({
        id: m.id,
        displayName: m.name,
        tier: resolveTier(m.id, tierMap),
        provider: providerFromModel(m.id),
        capabilities: capabilitiesForModel(m),
        pricing: {
            inputUsdPerMTok: odinCost.lookupPricing(m.id)?.inputUsdPerMTok ?? null,
            outputUsdPerMTok: odinCost.lookupPricing(m.id)?.outputUsdPerMTok ?? null,
        },
    }))
    return {
        auto: { id: 'auto', displayName: 'Alvys Auto (Odin)', tiers: tierMap },
        models: entries,
    }
}

export const odinService = {
    route,
    chat,
    listModels,
}
