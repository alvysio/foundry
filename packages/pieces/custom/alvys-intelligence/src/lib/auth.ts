import { PieceAuth, Property } from '@activepieces/pieces-framework';

/**
 * Alvys Intelligence connection.
 *
 * Holds document-pipeline credentials + safety / circuit-breaker policy that
 * applies to every action in the piece. Chat actions (Ask Alvys AI, Summarize,
 * Classify, Extract Structured Data) do not need keys here — they consume the
 * platform-configured **Alvys Intelligence** AI Provider via the standard AP
 * provider dropdown.
 *
 * Every policy field is optional. Blank → inherit platform default → inherit
 * built-in default. Per-step `Advanced` overrides win over connection values.
 */
export const alvysIntelligenceAuth = PieceAuth.CustomAuth({
  description: `
Alvys Intelligence connection — usually auto-provisioned by your administrator.

- **Alvys Bearer Token**: required for Ask Agent.
- **Document Intelligence Key**: required for the Document actions.
- **Safety / rate-limit / circuit-breaker fields**: optional; blank inherits the platform default.
  `,
  required: true,
  props: {
    environment: Property.StaticDropdown({
      displayName: 'Environment',
      description: 'Production or QA. Routes to the matching upstream endpoints.',
      required: true,
      defaultValue: 'production',
      options: {
        options: [
          { label: 'Production', value: 'production' },
          { label: 'QA', value: 'qa' },
        ],
      },
    }),
    chatBearerToken: PieceAuth.SecretText({
      displayName: 'Alvys Bearer Token',
      description:
        'Auth0-issued Alvys JWT (with company-code claim) accepted by the Insights chat API. Required for the Ask Agent action.',
      required: false,
    }),
    chatBaseUrl: Property.ShortText({
      displayName: 'Chat API Base URL (Optional)',
      description:
        'Override the Insights chat API base URL. Defaults to https://app.alvys.com (production) or https://qa.alvys.net (QA).',
      required: false,
    }),
    documentKey: PieceAuth.SecretText({
      displayName: 'Document Intelligence Key',
      description:
        'API key for the document extraction provider. Required for Classify / Route / Extract Document actions.',
      required: false,
    }),
    documentBaseUrl: Property.ShortText({
      displayName: 'Document Intelligence Endpoint (Optional)',
      description:
        'Override the document extraction endpoint. Leave blank to use the Alvys default for the selected environment.',
      required: false,
    }),
    documentTimeoutMs: Property.Number({
      displayName: 'Document Timeout (ms)',
      description: 'Override platform default. Range 1000–600000.',
      required: false,
    }),
    rateLimitMaxRequests: Property.Number({
      displayName: 'Rate Limit — Max Requests per Window',
      description:
        'Sliding-window rate limit per project. Overrides platform default if set. Range 1–10000.',
      required: false,
    }),
    rateLimitWindowSec: Property.Number({
      displayName: 'Rate Limit — Window (seconds)',
      description: 'Range 1–3600.',
      required: false,
    }),
    circuitFailureThreshold: Property.Number({
      displayName: 'Circuit Breaker — Failure Threshold',
      description:
        'Number of consecutive failures before the breaker opens. Range 1–100.',
      required: false,
    }),
    circuitRecoveryWindowSec: Property.Number({
      displayName: 'Circuit Breaker — Recovery Window (seconds)',
      description: 'Range 1–3600.',
      required: false,
    }),
    safetyMode: Property.StaticDropdown<string>({
      displayName: 'Safety Mode',
      description:
        'Strict redacts and applies the prompt-injection action; permissive only redacts; off disables redaction (not recommended).',
      required: false,
      options: {
        options: [
          { label: 'Inherit platform default', value: '' },
          { label: 'Strict', value: 'strict' },
          { label: 'Permissive', value: 'permissive' },
          { label: 'Off (not recommended)', value: 'off' },
        ],
      },
    }),
    redactCreditCards: Property.Checkbox({
      displayName: 'Redact Credit Cards',
      description: 'Mask Luhn-valid credit-card sequences before they leave the sandbox.',
      required: false,
    }),
    redactSsn: Property.Checkbox({
      displayName: 'Redact SSN',
      required: false,
    }),
    redactApiKeys: Property.Checkbox({
      displayName: 'Redact API Keys',
      required: false,
    }),
    promptInjectionAction: Property.StaticDropdown<string>({
      displayName: 'On Prompt Injection',
      description:
        'What to do when an inbound model response contains a prompt-injection signature.',
      required: false,
      options: {
        options: [
          { label: 'Inherit platform default', value: '' },
          { label: 'Block — refuse response', value: 'block' },
          { label: 'Warn — return response + flag', value: 'warn' },
          { label: 'Ignore', value: 'ignore' },
        ],
      },
    }),
  },
  validate: async ({ auth }) => {
    const v = (auth ?? {}) as Record<string, unknown>;
    const props = (v['props'] ?? v) as Record<string, unknown>;
    const environment = String(props['environment'] ?? '');
    if (!environment) {
      return { valid: false, error: 'Environment is required.' };
    }
    return { valid: true };
  },
});
