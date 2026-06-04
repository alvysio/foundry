import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const recordTripDepartureAction = createAction({
  auth: alvysAuth,
  name: 'record_trip_departure',
  displayName: 'Mark Stop Departed',
  description: 'Record the departure time from a trip stop.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
    stopId: Property.ShortText({ displayName: 'Stop Id', required: true }),
    departedAt: Property.DateTime({
      displayName: 'Departed At',
      required: true,
    }),
  },
  async run(context) {
    const { version, tripId, stopId, departedAt } = context.propsValue;
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.PUT,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/departure`,
      }),
      body: { DepartedAt: departedAt },
    });
  },
});
