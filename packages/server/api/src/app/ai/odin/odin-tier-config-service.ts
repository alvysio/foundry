import { apId, PlatformId } from '@activepieces/shared'
import { repoFactory } from '../../core/db/repo-factory'
import { OdinTierConfig, OdinTierConfigEntity } from './odin-tier-config-entity'
import { defaultTierMap, TierMap } from './odin-tier-map'
import { ModelTier } from './odin-types'

const odinTierConfigRepo = repoFactory<OdinTierConfig>(OdinTierConfigEntity)

async function loadTierMap(platformId: PlatformId): Promise<TierMap> {
    const rows = await odinTierConfigRepo().find({ where: { platformId, enabled: true } })
    const map: TierMap = defaultTierMap()
    for (const row of rows) {
        map[row.tier] = row.modelId
    }
    return map
}

async function upsertTier({
    platformId,
    tier,
    modelId,
    enabled,
}: {
    platformId: PlatformId
    tier: ModelTier
    modelId: string
    enabled: boolean
}): Promise<OdinTierConfig> {
    const repo = odinTierConfigRepo()
    const existing = await repo.findOne({ where: { platformId, tier } })
    if (existing === null) {
        const created = await repo.save({
            id: apId(),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            platformId,
            tier,
            modelId,
            enabled,
        })
        return created
    }
    existing.modelId = modelId
    existing.enabled = enabled
    existing.updated = new Date().toISOString()
    return repo.save(existing)
}

async function listForPlatform(platformId: PlatformId): Promise<OdinTierConfig[]> {
    return odinTierConfigRepo().find({ where: { platformId } })
}

export const odinTierConfigService = {
    loadTierMap,
    upsertTier,
    listForPlatform,
}
