import { describe, expect, it } from 'vitest'
import { odinMetadata } from '../../../../../src/app/ai/odin/odin-metadata'

describe('odin-metadata cf-aig builder', () => {
    it('builds Bearer auth + JSON metadata header', () => {
        const headers = odinMetadata.buildGatewayHeaders({
            apiKey: 'secret-key-xyz',
            metadata: {
                platformId: 'plat1',
                projectId: 'proj1',
                principalId: 'user1',
                tier: 'fast',
                mode: 'auto',
            },
        })
        expect(headers['cf-aig-authorization']).toBe('Bearer secret-key-xyz')
        const parsed = JSON.parse(headers['cf-aig-metadata'])
        expect(parsed.platformId).toBe('plat1')
        expect(parsed.projectId).toBe('proj1')
        expect(parsed.principalId).toBe('user1')
        expect(parsed.tier).toBe('fast')
        expect(parsed.mode).toBe('auto')
    })

    it('omits projectId / principalId when null', () => {
        const md = odinMetadata.buildGatewayMetadata({
            platformId: 'plat1',
            tier: 'balanced',
            mode: 'cost',
        })
        const parsed = JSON.parse(md)
        expect(parsed.projectId).toBeUndefined()
        expect(parsed.principalId).toBeUndefined()
    })
})
