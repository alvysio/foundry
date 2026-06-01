import {
  HttpMethod,
  QueryParams,
  HttpMessageBody,
  httpClient,
} from '@activepieces/pieces-common';

export const ALVYS_API_BASE = 'https://qaapi.alvys.net';
export const ALVYS_DEFAULT_VERSION = '1.0';

export async function alvysRequest<T = unknown>({
  token,
  method,
  path,
  queryParams,
  body,
  headers,
}: {
  token: string;
  method: HttpMethod;
  path: string;
  queryParams?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const response = await httpClient.sendRequest<T>({
    method,
    url: `${ALVYS_API_BASE}${path}`,
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
