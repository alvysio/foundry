import {
  HttpMethod,
  QueryParams,
  httpClient,
  HttpMessageBody,
} from '@activepieces/pieces-common';

import { alvysTokenService, AlvysStore } from './token-service';
import { AlvysAuthValue } from './types';

function normalizeAuth(input: unknown): AlvysAuthValue {
  const v = (input ?? {}) as Record<string, unknown>;
  const props = (v['props'] ?? v) as Record<string, unknown>;
  return {
    environment: String(props['environment'] ?? 'production'),
    clientId: String(props['clientId'] ?? ''),
    clientSecret: String(props['clientSecret'] ?? ''),
  };
}

export const ALVYS_DEFAULT_VERSION = '1.0';

export async function alvysRequest<T = unknown>({
  auth,
  store,
  method,
  path,
  queryParams,
  body,
  headers,
}: {
  auth: unknown;
  store?: AlvysStore;
  method: HttpMethod;
  path: string;
  queryParams?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const normalized = normalizeAuth(auth);
  const token = await alvysTokenService.resolveAlvysToken({ auth: normalized, store });
  const { apiBase } = alvysTokenService.getEnvConfig(normalized.environment);

  const response = await httpClient.sendRequest<T>({
    method,
    url: `${apiBase}${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    queryParams,
    body: body as HttpMessageBody | undefined,
  });
  return response.body;
}

export function buildPath({
  version,
  path,
}: {
  version?: string;
  path: string;
}): string {
  return `/api/p/v${version ?? ALVYS_DEFAULT_VERSION}${path}`;
}

export function cleanPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );
}

export function alvysApiBase(auth: unknown): string {
  return alvysTokenService.getEnvConfig(normalizeAuth(auth).environment).apiBase;
}
