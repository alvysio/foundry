import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod, QueryParams } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

function buildListAction({
  name,
  displayName,
  description,
  resourcePath,
}: {
  name: string;
  displayName: string;
  description: string;
  resourcePath: string;
}) {
  return createAction({
    auth: alvysAuth,
    name,
    displayName,
    description,
    props: {
      version: versionProp,
      query: Property.Object({
        displayName: 'Query Parameters',
        description: 'Key/value pairs appended as query string params.',
        required: false,
      }),
    },
    async run(context) {
      const { version, query } = context.propsValue;
      const queryParams: QueryParams = {};
      if (query && typeof query === 'object') {
        for (const [k, v] of Object.entries(query)) {
          if (v !== undefined && v !== null && v !== '')
            queryParams[k] = String(v);
        }
      }
      return alvysRequest({
        token: context.auth.secret_text,
        method: HttpMethod.GET,
        path: buildPath({ version, path: resourcePath }),
        queryParams,
      });
    },
  });
}

export const listDriversAction = buildListAction({
  name: 'list_drivers',
  displayName: 'List Drivers',
  description: 'GET /drivers with optional query params.',
  resourcePath: '/drivers',
});

export const listTrucksAction = buildListAction({
  name: 'list_trucks',
  displayName: 'List Trucks',
  description: 'GET /trucks with optional query params.',
  resourcePath: '/trucks',
});

export const listTrailersAction = buildListAction({
  name: 'list_trailers',
  displayName: 'List Trailers',
  description: 'GET /trailers with optional query params.',
  resourcePath: '/trailers',
});

export const listInvoicesAction = buildListAction({
  name: 'list_invoices',
  displayName: 'List Invoices',
  description: 'GET /invoices with optional query params.',
  resourcePath: '/invoices',
});

export const listLocationsAction = buildListAction({
  name: 'list_locations',
  displayName: 'List Locations',
  description: 'GET /locations with optional query params.',
  resourcePath: '/locations',
});

export const listTripsAction = buildListAction({
  name: 'list_trips',
  displayName: 'List Trips',
  description: 'GET /trips with optional query params.',
  resourcePath: '/trips',
});

export const listUsersAction = buildListAction({
  name: 'list_users',
  displayName: 'List Users',
  description: 'GET /users/list with optional query params.',
  resourcePath: '/users/list',
});
