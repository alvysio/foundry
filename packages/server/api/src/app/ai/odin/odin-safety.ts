import { SafetyFinding, SafetyReport } from './odin-types'

type PatternSpec = {
    name: string
    severity: SafetyFinding['severity']
    pattern: RegExp
    luhn?: boolean
}

const SECRET_PATTERNS: PatternSpec[] = [
    {
        name: 'private_key_block',
        severity: 'critical',
        pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    },
    { name: 'openai_key', severity: 'critical', pattern: /sk-[a-zA-Z0-9]{20,}/g },
    { name: 'github_token', severity: 'critical', pattern: /ghp_[a-zA-Z0-9]{36}/g },
    { name: 'github_oauth_token', severity: 'critical', pattern: /gho_[a-zA-Z0-9]{36}/g },
    { name: 'npm_token', severity: 'critical', pattern: /npm_[a-zA-Z0-9]{36}/g },
    { name: 'aws_access_key', severity: 'critical', pattern: /AKIA[0-9A-Z]{16}/g },
    {
        name: 'generic_api_key',
        severity: 'high',
        pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    },
    {
        name: 'generic_secret',
        severity: 'high',
        pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/gi,
    },
    {
        name: 'generic_bearer_token',
        severity: 'high',
        pattern: /(?:token|bearer)\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    },
]

const PII_PATTERNS: PatternSpec[] = [
    {
        name: 'email',
        severity: 'medium',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    },
    { name: 'us_ssn', severity: 'critical', pattern: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g },
    { name: 'us_phone', severity: 'medium', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
    {
        name: 'credit_card',
        severity: 'critical',
        pattern: /\b(?:\d[ -]*?){13,19}\b/g,
        luhn: true,
    },
]

const ALL_PATTERNS: PatternSpec[] = [...SECRET_PATTERNS, ...PII_PATTERNS]

function luhnValid(input: string): boolean {
    const digits = input.replace(/[\s-]/g, '')
    if (digits.length < 13 || digits.length > 19) return false
    let sum = 0
    let alt = false
    for (let i = digits.length - 1; i >= 0; i--) {
        const ch = digits.charCodeAt(i) - 48
        if (ch < 0 || ch > 9) return false
        let n = ch
        if (alt) {
            n *= 2
            if (n > 9) n -= 9
        }
        sum += n
        alt = !alt
    }
    return sum % 10 === 0
}

function redactMatch(match: string): string {
    if (match.length <= 8) return '*'.repeat(match.length)
    return `${match.slice(0, 4)}${'*'.repeat(Math.max(4, match.length - 8))}${match.slice(-4)}`
}

function evaluate(text: string): SafetyReport {
    const findings: SafetyFinding[] = []
    let redacted = text
    for (const spec of ALL_PATTERNS) {
        spec.pattern.lastIndex = 0
        const matches = text.match(spec.pattern) ?? []
        for (const m of matches) {
            if (spec.luhn === true && !luhnValid(m)) continue
            findings.push({ type: spec.name, severity: spec.severity, length: m.length })
            redacted = redacted.split(m).join(redactMatch(m))
        }
    }
    const blocked = findings.some(f => f.severity === 'critical')
    return { blocked, redactedText: redacted, findings }
}

function safeEvaluate(text: string): SafetyReport {
    try {
        return evaluate(text)
    }
    catch {
        return {
            blocked: true,
            redactedText: '',
            findings: [{ type: 'safety_error', severity: 'critical', length: 0 }],
        }
    }
}

export function guardInput(text: string): SafetyReport {
    return safeEvaluate(text)
}

export function guardOutput(text: string): SafetyReport {
    return safeEvaluate(text)
}

export const odinSafety = {
    guardInput,
    guardOutput,
    luhnValid,
    redactMatch,
}
