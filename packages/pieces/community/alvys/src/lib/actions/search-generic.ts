import { createAction } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import {
  mergeSearchBody,
  paginationProps,
  searchBodyProp,
  versionProp,
} from '../common/props';

function buildSearchAction({
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
      ...paginationProps,
      additional: searchBodyProp,
    },
    async run(context) {
      const { version, page, pageSize, includeDeleted, additional } =
        context.propsValue;
      return alvysRequest({
        token: context.auth.secret_text,
        method: HttpMethod.POST,
        path: buildPath({ version, path: `${resourcePath}/search` }),
        body: mergeSearchBody({
          base: {
            Page: page ?? 0,
            PageSize: pageSize ?? 50,
            IncludeDeleted: includeDeleted ?? false,
          },
          extra: additional,
        }),
      });
    },
  });
}

export const searchTrucksAction = buildSearchAction({
  name: 'search_trucks',
  displayName: 'Search Trucks',
  description: 'Search trucks with pagination and arbitrary filters.',
  resourcePath: '/trucks',
});

export const searchTrailersAction = buildSearchAction({
  name: 'search_trailers',
  displayName: 'Search Trailers',
  description: 'Search trailers with pagination and arbitrary filters.',
  resourcePath: '/trailers',
});

export const searchInvoicesAction = buildSearchAction({
  name: 'search_invoices',
  displayName: 'Search Invoices',
  description: 'Search invoices with pagination and arbitrary filters.',
  resourcePath: '/invoices',
});

export const searchLocationsAction = buildSearchAction({
  name: 'search_locations',
  displayName: 'Search Locations',
  description: 'Search locations with pagination and arbitrary filters.',
  resourcePath: '/locations',
});

export const searchTollsAction = buildSearchAction({
  name: 'search_tolls',
  displayName: 'Search Tolls',
  description: 'Search toll transactions with pagination and filters.',
  resourcePath: '/tolls',
});

export const searchFuelAction = buildSearchAction({
  name: 'search_fuel',
  displayName: 'Search Fuel Transactions',
  description: 'Search fuel transactions with pagination and filters.',
  resourcePath: '/fuel',
});

export const searchMaintenanceAction = buildSearchAction({
  name: 'search_maintenance',
  displayName: 'Search Maintenance Records',
  description: 'Search maintenance records with pagination and filters.',
  resourcePath: '/maintenance',
});

export const searchDeductionsAction = buildSearchAction({
  name: 'search_deductions',
  displayName: 'Search Deductions',
  description: 'Search deductions with pagination and filters.',
  resourcePath: '/deductions',
});

export const searchUsersAction = buildSearchAction({
  name: 'search_users',
  displayName: 'Search Users',
  description: 'Search platform users with pagination and filters.',
  resourcePath: '/users',
});

export const searchDispatchPreferencesAction = buildSearchAction({
  name: 'search_dispatch_preferences',
  displayName: 'Search Dispatch Preferences',
  description: 'Search dispatch preferences with pagination and filters.',
  resourcePath: '/dispatchpreferences',
});

export const searchTruckEventsAction = buildSearchAction({
  name: 'search_truck_events',
  displayName: 'Search Truck Events',
  description: 'Search truck events with pagination and filters.',
  resourcePath: '/trucks/events',
});

export const searchTrailerEventsAction = buildSearchAction({
  name: 'search_trailer_events',
  displayName: 'Search Trailer Events',
  description: 'Search trailer events with pagination and filters.',
  resourcePath: '/trailers/events',
});

export const searchDriverEventsAction = buildSearchAction({
  name: 'search_driver_events',
  displayName: 'Search Driver Events',
  description: 'Search driver events with pagination and filters.',
  resourcePath: '/drivers/events',
});
