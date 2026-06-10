import { describe, expect, it } from 'vitest'
import { decideRoute, analyzeComplexity } from '../../../../../src/app/ai/odin/odin-router'
import { defaultTierMap } from '../../../../../src/app/ai/odin/odin-tier-map'

function userMsg(content: string) {
    return [{ role: 'user' as const, content }]
}

describe('odin-router', () => {
    it('cost mode always picks fast tier', () => {
        const d = decideRoute({ messages: userMsg('Architect a distributed system'), mode: 'cost' })
        expect(d.tier).toBe('fast')
    })

    it('quality mode always picks powerful tier', () => {
        const d = decideRoute({ messages: userMsg('Fix typo'), mode: 'quality' })
        expect(d.tier).toBe('powerful')
    })

    it('latency mode picks fast when no breaker open', () => {
        const d = decideRoute({ messages: userMsg('Rename variable'), mode: 'latency' })
        expect(d.tier).toBe('fast')
    })

    it('auto mode picks powerful for complex prompts', () => {
        const text = 'Architect, design and refactor a complex distributed concurrent algorithm. Investigate performance and security. Analyze across multiple files and the entire codebase. Investigate the issue step-by-step and explain why it might fail.'
        const d = decideRoute({ messages: userMsg(text), mode: 'auto' })
        expect(d.tier).toBe('powerful')
    })

    it('auto mode picks fast for trivial prompts', () => {
        const d = decideRoute({ messages: userMsg('rename foo to bar'), mode: 'auto' })
        expect(['fast', 'balanced']).toContain(d.tier)
    })

    it('decision includes model from tier map', () => {
        const map = defaultTierMap()
        const d = decideRoute({ messages: userMsg('Hello'), mode: 'auto', tierMap: map })
        expect(d.model).toBe(map[d.tier])
        expect(d.provider).toBe(d.model.split('/')[0])
    })

    it('ambiguous prompt returns valid confidence in [0,1]', () => {
        const d = decideRoute({ messages: userMsg('maybe update something somewhere'), mode: 'auto' })
        expect(d.confidence).toBeGreaterThanOrEqual(0)
        expect(d.confidence).toBeLessThanOrEqual(1)
        expect(d.alternatives.length).toBe(2)
    })

    it('analyzeComplexity returns score in [0,1]', () => {
        const a = analyzeComplexity(userMsg('Implement a feature'))
        expect(a.score).toBeGreaterThanOrEqual(0)
        expect(a.score).toBeLessThanOrEqual(1)
    })
})
