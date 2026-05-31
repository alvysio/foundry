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

export const searchInvoicesAction = buildSearchAction({
  name: 'search_invoices',
  displayName: 'Search Invoices',
  description: 'Search invoices with pagination and arbitrary filters.',
  resourcePath: '/invoices',
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
