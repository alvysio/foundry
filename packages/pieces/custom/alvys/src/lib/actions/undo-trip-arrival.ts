import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const undoTripArrivalAction = createAction({
  auth: alvysAuth,
  name: 'undo_trip_arrival',
  displayName: 'Clear Stop Arrival',
  description: 'Undo a recorded arrival at a trip stop.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
    stopId: Property.ShortText({ displayName: 'Stop Id', required: true }),
  },
  async run(context) {
    const { version, tripId, stopId } = context.propsValue;
    await alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.DELETE,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/arrival`,
      }),
    });
    return { cleared: true, tripId, stopId };
  },
});
