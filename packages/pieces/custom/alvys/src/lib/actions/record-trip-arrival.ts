import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const recordTripArrivalAction = createAction({
  auth: alvysAuth,
  name: 'record_trip_arrival',
  displayName: 'Mark Stop Arrived',
  description: 'Record the arrival time at a trip stop.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
    stopId: Property.ShortText({ displayName: 'Stop Id', required: true }),
    arrivedAt: Property.DateTime({
      displayName: 'Arrived At',
      description: 'ISO-8601 timestamp of the arrival.',
      required: true,
    }),
  },
  async run(context) {
    const { version, tripId, stopId, arrivedAt } = context.propsValue;
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.PUT,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/arrival`,
      }),
      body: { ArrivedAt: arrivedAt },
    });
  },
});
