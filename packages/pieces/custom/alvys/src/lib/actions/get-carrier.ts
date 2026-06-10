import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getCarrierAction = createAction({
  auth: alvysAuth,
  name: 'get_carrier',
  displayName: 'Get Carrier',
  description: 'Fetch a carrier by id, or list its documents when documents is true.',
  props: {
    version: versionProp,
    carrierId: Property.ShortText({
      displayName: 'Carrier Id',
      required: true,
    }),
    documents: Property.Checkbox({
      displayName: 'Fetch Documents',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const { version, carrierId, documents } = context.propsValue;
    const path = documents
      ? `/carriers/${encodeURIComponent(carrierId)}/documents`
      : `/carriers/${encodeURIComponent(carrierId)}`;
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.GET,
      path: buildPath({ version, path }),
    });
  },
});
