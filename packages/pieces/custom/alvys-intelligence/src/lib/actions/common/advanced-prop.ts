import { Property } from '@activepieces/pieces-framework';
import { EffectiveConfig } from '../../runtime/effective-config';

/**
 * Shared "Advanced" Property.Object — per-step overrides for security and
 * thinking settings. Highest precedence in the layered resolver: blanks
 * inherit connection / platform / default values.
 */
export const advancedProp = Property.Object({
  displayName: 'Advanced',
  description:
    'Optional per-step overrides. Blank values inherit from the connection + platform defaults.',
  required: false,
});

export function readStepAdvanced(value: unknown): Partial<EffectiveConfig> {
  const obj = (value ?? {}) as Record<string, unknown>;
  const out: Partial<EffectiveConfig> = {};
  if (typeof obj['rateLimitMaxRequests'] === 'number') out.rateLimitMaxRequests = obj['rateLimitMaxRequests'] as number;
  if (typeof obj['rateLimitWindowSec'] === 'number') out.rateLimitWindowSec = obj['rateLimitWindowSec'] as number;
  if (typeof obj['circuitFailureThreshold'] === 'number') out.circuitFailureThreshold = obj['circuitFailureThreshold'] as number;
  if (typeof obj['circuitRecoveryWindowSec'] === 'number') out.circuitRecoveryWindowSec = obj['circuitRecoveryWindowSec'] as number;
  if (typeof obj['safetyMode'] === 'string' && obj['safetyMode']) {
    out.safetyMode = obj['safetyMode'] as EffectiveConfig['safetyMode'];
  }
  if (typeof obj['redactCreditCards'] === 'boolean') out.redactCreditCards = obj['redactCreditCards'] as boolean;
  if (typeof obj['redactSsn'] === 'boolean') out.redactSsn = obj['redactSsn'] as boolean;
  if (typeof obj['redactApiKeys'] === 'boolean') out.redactApiKeys = obj['redactApiKeys'] as boolean;
  if (typeof obj['promptInjectionAction'] === 'string' && obj['promptInjectionAction']) {
    out.promptInjectionAction = obj['promptInjectionAction'] as EffectiveConfig['promptInjectionAction'];
  }
  if (typeof obj['thinkingBudgetTokens'] === 'number') out.thinkingBudgetTokens = obj['thinkingBudgetTokens'] as number;
  if (typeof obj['documentBaseUrl'] === 'string' && obj['documentBaseUrl']) {
    out.documentBaseUrl = obj['documentBaseUrl'] as string;
  }
  if (typeof obj['documentTimeoutMs'] === 'number') out.documentTimeoutMs = obj['documentTimeoutMs'] as number;
  return out;
}
