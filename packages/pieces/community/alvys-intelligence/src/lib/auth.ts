import { PieceAuth, Property } from '@activepieces/pieces-framework';

/**
 * Alvys Intelligence connection.
 *
 * Holds the model-provider API keys the piece needs to fulfill requests
 * entirely inside the AP sandbox. The same connection can power chat,
 * classification, structured-data extraction, and document extraction.
 *
 * The connection also carries OPTIONAL security + thinking overrides. Any
 * value left blank falls back to the platform default (configured in
 * Platform Admin → AI Providers → Alvys Intelligence), then to the built-in
 * default. Per-step overrides on individual actions further override these.
 */
export const alvysIntelligenceAuth = PieceAuth.CustomAuth({
  description: `
Configure Alvys Intelligence credentials and security policy. Keys are stored
encrypted; the piece never echoes them back in flow output. Leave a policy
field blank to inherit the platform default.
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
    chatPrimaryKey: PieceAuth.SecretText({
      displayName: 'Chat Primary Key',
      description:
        'Primary model API key used for chat / classify / structured-data actions.',
      required: false,
    }),
    chatSecondaryKey: PieceAuth.SecretText({
      displayName: 'Chat Secondary Key',
      description:
        'Secondary model API key used for tier fallback when the primary provider rate-limits or errors.',
      required: false,
    }),
    chatTertiaryKey: PieceAuth.SecretText({
      displayName: 'Chat Tertiary Key',
      description: 'Tertiary fallback model API key.',
      required: false,
    }),
    documentKey: PieceAuth.SecretText({
      displayName: 'Document Intelligence Key',
      description:
        'API key for the document extraction provider. Required for Extract Document.',
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
    thinkingBudgetTokens: Property.Number({
      displayName: 'Thinking Budget (tokens)',
      description:
        'Extended-thinking budget for the Smart tier. 0 disables. Range 0–64000.',
      required: false,
    }),
  },
});
