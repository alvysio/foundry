import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getTripDocumentsAction = createAction({
  auth: alvysAuth,
  name: 'get_trip_documents',
  displayName: 'Get Trip Documents',
  description: 'List documents attached to a trip.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
  },
  async run(context) {
    const { version, tripId } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/documents`,
      }),
    });
  },
});

export const deleteTripStopArrivalAction = createAction({
  auth: alvysAuth,
  name: 'delete_trip_stop_arrival',
  displayName: 'Delete Trip Stop Arrival',
  description: 'Remove a recorded arrival from a trip stop.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
    stopId: Property.ShortText({ displayName: 'Stop Id', required: true }),
  },
  async run(context) {
    const { version, tripId, stopId } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.DELETE,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/arrival`,
      }),
    });
  },
});
