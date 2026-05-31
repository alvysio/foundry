import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getTripStopsAction = createAction({
  auth: alvysAuth,
  name: 'get_trip_stops',
  displayName: 'Get Trip Stops',
  description: 'List all stops on a trip, or fetch a single stop when a stop id is provided.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
    stopId: Property.ShortText({
      displayName: 'Stop Id',
      description: 'Optional. When provided, returns a single stop.',
      required: false,
    }),
  },
  async run(context) {
    const { version, tripId, stopId } = context.propsValue;
    const suffix = stopId
      ? `/${encodeURIComponent(stopId)}`
      : '';
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/stops${suffix}`,
      }),
    });
  },
});
