import { describe, expect, it, vi } from 'vitest'
import { guardInput, guardOutput, odinSafety } from '../../../../../src/app/ai/odin/odin-safety'

describe('odin-safety redaction format', () => {
    it('redacts OpenAI key as first4+****+last4', () => {
        const r = guardInput('here is my key sk-abcdefghijklmnopqrstuvwxyz1234567890')
        expect(r.findings.some(f => f.type === 'openai_key' && f.severity === 'critical')).toBe(true)
        expect(r.blocked).toBe(true)
        expect(r.redactedText).toContain('sk-a')
        expect(r.redactedText).toContain('****')
        expect(r.redactedText).toContain('7890')
        expect(r.redactedText).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234567890')
    })

    it('redacts AWS access key', () => {
        const r = guardInput('AKIAIOSFODNN7EXAMPLE here')
        expect(r.findings.some(f => f.type === 'aws_access_key')).toBe(true)
    })

    it('blocks valid credit card (Luhn) but not random digits', () => {
        const valid = '4111 1111 1111 1111'
        const invalid = '4111 1111 1111 1112'
        const r1 = guardInput(`card ${valid}`)
        const r2 = guardInput(`digits ${invalid}`)
        expect(r1.findings.some(f => f.type === 'credit_card')).toBe(true)
        expect(r1.blocked).toBe(true)
        expect(r2.findings.some(f => f.type === 'credit_card')).toBe(false)
    })

    it('blocks US SSN', () => {
        const r = guardInput('SSN 123-45-6789 confidential')
        expect(r.findings.some(f => f.type === 'us_ssn' && f.severity === 'critical')).toBe(true)
        expect(r.blocked).toBe(true)
    })

    it('redacts email but does not block', () => {
        const r = guardOutput('contact john.doe@example.com for details')
        expect(r.findings.some(f => f.type === 'email')).toBe(true)
        expect(r.blocked).toBe(false)
        expect(r.redactedText).not.toContain('john.doe@example.com')
    })

    it('fail-closed: throws inside pattern eval → blocked: true', () => {
        const spy = vi.spyOn(String.prototype, 'match').mockImplementation(() => {
            throw new Error('boom')
        })
        try {
            const r = guardInput('benign content')
            expect(r.blocked).toBe(true)
            expect(r.findings[0]?.type).toBe('safety_error')
        }
        finally {
            spy.mockRestore()
        }
    })

    it('luhnValid accepts known-good and rejects mangled', () => {
        expect(odinSafety.luhnValid('4111111111111111')).toBe(true)
        expect(odinSafety.luhnValid('4111111111111112')).toBe(false)
        expect(odinSafety.luhnValid('12')).toBe(false)
    })
})
