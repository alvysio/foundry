/**
 * Upstream voice provider client — vendor identity is confined to this module.
 *
 * Every other file in this piece imports from `./client.ts` (the public,
 * Alvys-shaped wrapper) instead of touching the upstream SDK directly. This
 * keeps stack traces, telemetry, and any future leakage controls focused on a
 * single surface.
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ElevenLabsEnvironment } from '@elevenlabs/elevenlabs-js/environments';

import { AlvysVoiceResidency } from './types';

export const RESIDENCY_ENV: Record<AlvysVoiceResidency, ElevenLabsEnvironment> = {
  default: ElevenLabsEnvironment.Production,
  us: ElevenLabsEnvironment.ProductionUs,
  eu: ElevenLabsEnvironment.ProductionEu,
};

export function buildVoiceClient({
  apiKey,
  region,
}: {
  apiKey: string;
  region: AlvysVoiceResidency;
}): ElevenLabsClient {
  return new ElevenLabsClient({
    apiKey,
    environment: RESIDENCY_ENV[region],
  });
}

export type VoiceClient = ElevenLabsClient;
