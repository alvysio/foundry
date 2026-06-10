import { describe, expect, it } from 'vitest'
import { odinCost } from '../../../../../src/app/ai/odin/odin-cost'

describe('odin-cost', () => {
    it('returns zero cost for unknown model', () => {
        const c = odinCost.computeCost('vendor/unknown', { inputTokens: 100, outputTokens: 50, totalTokens: 150 })
        expect(c.totalUsd).toBe(0)
    })

    it('computes cost for known model linearly', () => {
        const c = odinCost.computeCost('openai/gpt-4o-mini', { inputTokens: 1_000_000, outputTokens: 1_000_000, totalTokens: 2_000_000 })
        expect(c.inputUsd).toBeCloseTo(0.15, 4)
        expect(c.outputUsd).toBeCloseTo(0.60, 4)
        expect(c.totalUsd).toBeCloseTo(0.75, 4)
    })
})
