/**
 * Document-extraction provider — direct upstream call.
 *
 * Internal-only. The upstream vendor identity is confined to this file; the
 * action layer must only consume `BemExtractResponse` shape, which is mapped
 * to Alvys-shaped output before the AP flow ever sees it.
 *
 * Auth: bearer header. Endpoint configurable via the connection's
 * environment-aware base URL.
 */

import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export type BemExtractRequest = {
  apiKey: string;
  baseUrl: string;
  workflowId: string;
  fileBase64: string;
  fileName: string;
  mimeType: string;
};

export type BemExtractResponse = {
  transformationId: string;
  status: 'completed' | 'pending' | 'failed';
  fields: Record<string, unknown>;
  confidence?: number;
};

export async function bemExtract(req: BemExtractRequest): Promise<BemExtractResponse> {
  const response = await httpClient.sendRequest<{
    transformationID: string;
    status: string;
    transformedContent?: Record<string, unknown>;
    confidence?: number;
  }>({
    method: HttpMethod.POST,
    url: `${req.baseUrl}/workflows/${encodeURIComponent(req.workflowId)}/run`,
    headers: {
      'x-api-key': req.apiKey,
      'content-type': 'application/json',
    },
    body: {
      input: {
        fileName: req.fileName,
        mimeType: req.mimeType,
        contentBase64: req.fileBase64,
      },
    },
  });

  return {
    transformationId: response.body.transformationID,
    status:
      response.body.status === 'completed'
        ? 'completed'
        : response.body.status === 'failed'
        ? 'failed'
        : 'pending',
    fields: response.body.transformedContent ?? {},
    confidence: response.body.confidence,
  };
}
