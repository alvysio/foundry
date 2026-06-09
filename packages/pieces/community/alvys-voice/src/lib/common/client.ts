import { AppConnectionValueForAuthProperty } from '@activepieces/pieces-framework';

import { buildVoiceClient, RESIDENCY_ENV, VoiceClient } from './voice-provider';
import { AlvysVoiceAuthProps, AlvysVoiceResidency } from './types';

import type { alvysVoiceAuth } from '../auth';

type AuthValue = AppConnectionValueForAuthProperty<typeof alvysVoiceAuth>;

/**
 * Extracts the API key from a connection value. The framework deserializes
 * SecretText props into objects on legacy connections, so fall back to merging
 * any string values if the canonical shape isn't present.
 */
export function readApiKey(auth: AuthValue | string): string {
  if (typeof auth === 'string') {
    return auth;
  }
  return auth?.props.apiKey ?? Object.values(auth.props).join('');
}

export function readRegion(auth: AuthValue): AlvysVoiceResidency {
  return auth?.props.region ?? 'default';
}

export function regionBaseUrl(region?: AlvysVoiceResidency): string {
  return RESIDENCY_ENV[region ?? 'default'].base;
}

export function createVoiceClient(auth: AuthValue): VoiceClient {
  return buildVoiceClient({
    apiKey: readApiKey(auth),
    region: readRegion(auth),
  });
}

export type { AlvysVoiceAuthProps, AlvysVoiceResidency };
