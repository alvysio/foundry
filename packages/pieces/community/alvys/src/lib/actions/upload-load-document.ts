import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import FormData from 'form-data';

import { alvysAuth } from '../auth';
import { ALVYS_API_BASE, buildPath } from '../common/client';
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

    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `${ALVYS_API_BASE}${path}`,
      headers: {
        Authorization: `Bearer ${context.auth.secret_text}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    return response.body;
  },
});
