import { ModelTier, RoutingMode } from './odin-types'

export type GatewayMetadataInput = {
    platformId: string
    projectId?: string | null
    principalId?: string | null
    tier: ModelTier
    mode: RoutingMode
    extra?: Record<string, string>
}

export function buildGatewayMetadata(input: GatewayMetadataInput): string {
    const base: Record<string, string> = {
        platformId: input.platformId,
        tier: input.tier,
        mode: input.mode,
    }
    if (input.projectId) base['projectId'] = input.projectId
    if (input.principalId) base['principalId'] = input.principalId
    if (input.extra) Object.assign(base, input.extra)
    return JSON.stringify(base)
}

export function buildGatewayHeaders({
    apiKey,
    metadata,
}: {
    apiKey: string
    metadata: GatewayMetadataInput
}): Record<string, string> {
    return {
        'cf-aig-authorization': `Bearer ${apiKey}`,
        'cf-aig-metadata': buildGatewayMetadata(metadata),
    }
}

export const odinMetadata = { buildGatewayMetadata, buildGatewayHeaders }
