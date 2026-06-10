import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getTripDocumentsAction = createAction({
  auth: alvysAuth,
  name: 'get_trip_documents',
  displayName: 'List Trip Documents',
  description: 'List documents attached to a trip.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
  },
  async run(context) {
    const { version, tripId } = context.propsValue;
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/documents`,
      }),
    });
  },
});
