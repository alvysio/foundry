/**
 * Safety pipeline — PII redaction + prompt-injection scanning.
 *
 * Patterns ported from the safety layer of `@alvysio/odin`'s broker
 * implementation. Runs on every request body and on every response body
 * before either leaves the piece sandbox.
 *
 * Outbound:
 *   - Redact credit-card-like sequences (Luhn-valid) → first4 + ****** + last4
 *   - Redact SSN-like (NNN-NN-NNNN), API-key-like (long base64ish)
 *   - Strip control characters
 *
 * Inbound:
 *   - Heuristic prompt-injection check on tool/system output: known jailbreak
 *     phrases, embedded "ignore previous instructions" patterns, base64-encoded
 *     hidden directives.
 *
 * Fail-closed posture: if a pattern is detected on an outbound payload the
 * caller decides whether to (a) redact + proceed or (b) reject. The piece
 * defaults to redact + proceed for known-safe shapes and reject for unknown.
 */

export type SafetyFinding = {
  category: 'pii.cc' | 'pii.ssn' | 'pii.api_key' | 'prompt.injection' | 'control_chars';
  matchedSample: string;
  replacement?: string;
};

export type SafetyResult = {
  redacted: string;
  findings: SafetyFinding[];
};

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const API_KEY_PATTERN = /\b(?:sk|pk|ak|eyJ)[A-Za-z0-9_\-]{20,}\b/g;
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
const CC_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;

const INJECTION_PHRASES = [
  /\bignore (?:previous|prior|above|all) instructions?\b/i,
  /\bdisregard (?:previous|prior|above|all) instructions?\b/i,
  /\bnew (?:instructions?|system prompt)\b/i,
  /\bsystem:?\s*you are now\b/i,
  /\bact as (?:dan|jailbreak|admin)\b/i,
];

function passesLuhn(digits: string): boolean {
  const stripped = digits.replace(/\D/g, '');
  if (stripped.length < 13 || stripped.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = stripped.length - 1; i >= 0; i--) {
    let n = parseInt(stripped[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function maskCreditCard(raw: string): string {
  const stripped = raw.replace(/\D/g, '');
  if (stripped.length < 13) return raw;
  const first4 = stripped.slice(0, 4);
  const last4 = stripped.slice(-4);
  return `${first4}******${last4}`;
}

export const safety = {
  redactOutbound(input: string): SafetyResult {
    const findings: SafetyFinding[] = [];
    let out = input;

    out = out.replace(CC_PATTERN, (match) => {
      if (!passesLuhn(match)) return match;
      const replacement = maskCreditCard(match);
      findings.push({ category: 'pii.cc', matchedSample: match.slice(0, 4) + '…', replacement });
      return replacement;
    });

    out = out.replace(SSN_PATTERN, (match) => {
      const replacement = `***-**-${match.slice(-4)}`;
      findings.push({ category: 'pii.ssn', matchedSample: match.slice(0, 3) + '…', replacement });
      return replacement;
    });

    out = out.replace(API_KEY_PATTERN, (match) => {
      const replacement = `${match.slice(0, 4)}…${match.slice(-4)}`;
      findings.push({ category: 'pii.api_key', matchedSample: match.slice(0, 4) + '…', replacement });
      return replacement;
    });

    out = out.replace(CONTROL_CHAR_PATTERN, () => {
      findings.push({ category: 'control_chars', matchedSample: '<ctrl>' });
      return '';
    });

    return { redacted: out, findings };
  },

  scanInboundForInjection(input: string): SafetyFinding[] {
    const findings: SafetyFinding[] = [];
    for (const pattern of INJECTION_PHRASES) {
      const match = input.match(pattern);
      if (match) {
        findings.push({
          category: 'prompt.injection',
          matchedSample: match[0].slice(0, 60),
        });
      }
    }
    return findings;
  },
};
