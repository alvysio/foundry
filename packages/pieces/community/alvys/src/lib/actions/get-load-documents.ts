import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getLoadDocumentsAction = createAction({
  auth: alvysAuth,
  name: 'get_load_documents',
  displayName: 'Get Load Documents',
  description: 'List documents attached to a load.',
  props: {
    version: versionProp,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
  },
  async run(context) {
    const { version, loadNumber } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/loads/${encodeURIComponent(loadNumber)}/documents`,
      }),
    });
  },
});
