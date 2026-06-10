import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getDriverAction = createAction({
  auth: alvysAuth,
  name: 'get_driver',
  displayName: 'Get Driver',
  description: 'Fetch a driver by id, or list documents when documents is true.',
  props: {
    version: versionProp,
    driverId: Property.ShortText({ displayName: 'Driver Id', required: true }),
    documents: Property.Checkbox({
      displayName: 'Fetch Documents',
      description: 'When checked, returns the driver documents instead of the driver record.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const { version, driverId, documents } = context.propsValue;
    const path = documents
      ? `/drivers/${encodeURIComponent(driverId)}/documents`
      : `/drivers/${encodeURIComponent(driverId)}`;
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.GET,
      path: buildPath({ version, path }),
    });
  },
});
