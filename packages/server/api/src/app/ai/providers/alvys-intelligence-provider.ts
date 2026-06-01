import { httpClient, HttpMethod } from '@activepieces/pieces-common'
import {
    AIProviderModel,
    AIProviderModelType,
    ALVYS_INTELLIGENCE_TIERS,
    AlvysIntelligenceProviderAuthConfig,
    AlvysIntelligenceProviderConfig,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { AIProviderStrategy } from './ai-provider'

const ODIN_INTERNAL_BASE_URL = process.env['ODIN_INTERNAL_BASE_URL'] ?? 'http://127.0.0.1:3000'

const TIER_DISPLAY_NAMES: Record<string, string> = {
    'alvys-fast': 'Alvys Fast',
    'alvys-balanced': 'Alvys Balanced',
    'alvys-smart': 'Alvys Smart',
    'alvys-long-context': 'Alvys Long Context (1M tokens)',
}

export const alvysIntelligenceProvider: AIProviderStrategy<AlvysIntelligenceProviderAuthConfig, AlvysIntelligenceProviderConfig> = {
    name: 'Alvys Intelligence',
    async validateConnection(
        authConfig: AlvysIntelligenceProviderAuthConfig,
        _config: AlvysIntelligenceProviderConfig,
        log: FastifyBaseLogger,
    ): Promise<void> {
        try {
            await httpClient.sendRequest({
                method: HttpMethod.POST,
                url: `${ODIN_INTERNAL_BASE_URL}/v1/odin/route`,
                headers: {
                    Authorization: `Bearer ${authConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: {
                    messages: [{ role: 'user', content: 'ping' }],
                    mode: 'cost',
                },
            })
        }
        catch (error: unknown) {
            log.error({ err: error }, '[alvysIntelligenceProvider#validateConnection] Failed to reach Odin /route')
            throw new Error('Could not reach the Alvys Intelligence broker — verify the platform API token and that Odin is configured for this platform.')
        }
    },
    async listModels(
        _authConfig: AlvysIntelligenceProviderAuthConfig,
        _config: AlvysIntelligenceProviderConfig,
    ): Promise<AIProviderModel[]> {
        return ALVYS_INTELLIGENCE_TIERS.map(tier => ({
            id: tier,
            name: TIER_DISPLAY_NAMES[tier] ?? tier,
            type: AIProviderModelType.TEXT,
        }))
    },
}
