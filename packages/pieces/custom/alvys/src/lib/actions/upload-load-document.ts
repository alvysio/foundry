import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import FormData from 'form-data';

import { alvysAuth } from '../auth';
import { alvysApiBase, buildPath } from '../common/client';
import { alvysTokenService } from '../common/token-service';
import { versionProp } from '../common/props';

export const uploadLoadDocumentAction = createAction({
  auth: alvysAuth,
  name: 'upload_load_document',
  displayName: 'Attach Document to Load',
  description: 'Upload a document (POD, ratecon, BOL, etc.) to a load.',
  props: {
    version: versionProp,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
    file: Property.File({
      displayName: 'File',
      required: true,
    }),
    documentType: Property.ShortText({
      displayName: 'Document Type',
      required: false,
    }),
  },
  async run(context) {
    const { version, loadNumber, file, documentType } = context.propsValue;

    const formData = new FormData();
    formData.append(
      'file',
      Buffer.from(file.base64, 'base64'),
      file.filename,
    );
    if (documentType) {
      formData.append('documentType', documentType);
    }

    const path = buildPath({
      version,
      path: `/loads/${encodeURIComponent(loadNumber)}/document`,
    });

    const raw = context.auth as unknown as { props?: { environment?: string; clientId?: string; clientSecret?: string }; environment?: string; clientId?: string; clientSecret?: string };
    const src = raw?.props ?? raw;
    const normalizedAuth = {
      environment: src?.environment ?? 'production',
      clientId: src?.clientId ?? '',
      clientSecret: src?.clientSecret ?? '',
    };
    const token = await alvysTokenService.resolveAlvysToken({
      auth: normalizedAuth,
      store: context.store,
    });

    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `${alvysApiBase(context.auth)}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    return response.body;
  },
});
