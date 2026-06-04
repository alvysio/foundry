import { httpClient, HttpMethod } from '@activepieces/pieces-common';

import { AlvysAuthValue } from './types';

type CachedToken = { token: string; exp: number };

const ENV_CONFIG: Record<string, { tokenUrl: string; apiBase: string }> = {
  production: {
    tokenUrl: 'https://auth.alvys.com/oauth/token',
    apiBase: 'https://api.alvys.com',
  },
  qa: {
    tokenUrl: 'https://qaauth.alvys.net/oauth/token',
    apiBase: 'https://qaapi.alvys.net',
  },
};

const PUBLIC_API_AUDIENCE = 'https://api.alvys.com/public/';
const REFRESH_BUFFER_SECONDS = 60;

function decodeExpFromJwt(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

async function exchangeClientCredentials({ tokenUrl, clientId, clientSecret }: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ token: string; exp: number }> {
  const response = await httpClient.sendRequest<{ access_token: string; expires_in: number }>({
    method: HttpMethod.POST,
    url: tokenUrl,
    headers: { 'Content-Type': 'application/json' },
    body: {
      client_id: clientId,
      client_secret: clientSecret,
      audience: PUBLIC_API_AUDIENCE,
      grant_type: 'client_credentials',
    },
  });
  const token = response.body.access_token;
  const decodedExp = decodeExpFromJwt(token);
  const exp = decodedExp ?? Math.floor(Date.now() / 1000) + (response.body.expires_in ?? 900);
  return { token, exp };
}

function cacheKey(env: string, clientId: string): string {
  return `alvys_token_${env}_${clientId}`;
}

type AlvysStore = {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<T>;
};

async function resolveAlvysToken({ auth, store }: {
  auth: AlvysAuthValue;
  store?: AlvysStore;
}): Promise<string> {
  const env = auth.environment;
  const cfg = ENV_CONFIG[env];
  if (!cfg) throw new Error(`Unknown Alvys environment: ${env}`);

  if (store) {
    const cached = await store.get<CachedToken>(cacheKey(env, auth.clientId));
    if (cached && cached.exp - Math.floor(Date.now() / 1000) > REFRESH_BUFFER_SECONDS) {
      return cached.token;
    }
  }

  const fresh = await exchangeClientCredentials({
    tokenUrl: cfg.tokenUrl,
    clientId: auth.clientId,
    clientSecret: auth.clientSecret,
  });

  if (store) {
    await store.put<CachedToken>(cacheKey(env, auth.clientId), fresh);
  }

  return fresh.token;
}

function getEnvConfig(env: string): { tokenUrl: string; apiBase: string } {
  const cfg = ENV_CONFIG[env];
  if (!cfg) throw new Error(`Unknown Alvys environment: ${env}`);
  return cfg;
}

export const alvysTokenService = {
  resolveAlvysToken,
  getEnvConfig,
};

export type { AlvysStore };
