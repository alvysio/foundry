import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import {
  mergeSearchBody,
  paginationProps,
  searchBodyProp,
  versionProp,
} from '../common/props';

export const searchLoadsAction = createAction({
  auth: alvysAuth,
  name: 'search_loads',
  displayName: 'Find Loads',
  description: 'Search loads with pagination, date range and status filters.',
  props: {
    version: versionProp,
    ...paginationProps,
    status: Property.Array({
      displayName: 'Status',
      description: 'Filter by load status values.',
      required: false,
    }),
    loadNumbers: Property.Array({
      displayName: 'Load Numbers',
      required: false,
    }),
    orderNumbers: Property.Array({
      displayName: 'Order Numbers',
      required: false,
    }),
    customerId: Property.ShortText({
      displayName: 'Customer Id',
      required: false,
    }),
    dateRangeFrom: Property.DateTime({
      displayName: 'Date Range From',
      required: false,
    }),
    dateRangeTo: Property.DateTime({
      displayName: 'Date Range To',
      required: false,
    }),
    additional: searchBodyProp,
  },
  async run(context) {
    const {
      version,
      page,
      pageSize,
      includeDeleted,
      status,
      loadNumbers,
      orderNumbers,
      customerId,
      dateRangeFrom,
      dateRangeTo,
      additional,
    } = context.propsValue;
    const base: Record<string, unknown> = {
      Page: page ?? 0,
      PageSize: pageSize ?? 50,
      IncludeDeleted: includeDeleted ?? false,
    };
    if (status && status.length > 0) base['Status'] = status;
    if (loadNumbers && loadNumbers.length > 0) base['LoadNumbers'] = loadNumbers;
    if (orderNumbers && orderNumbers.length > 0)
      base['OrderNumbers'] = orderNumbers;
    if (customerId) base['CustomerId'] = customerId;
    if (dateRangeFrom || dateRangeTo) {
      base['DateRange'] = {
        ...(dateRangeFrom ? { Start: dateRangeFrom } : {}),
        ...(dateRangeTo ? { End: dateRangeTo } : {}),
      };
    }
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/loads/search' }),
      body: mergeSearchBody({ base, extra: additional }),
    });
  },
});
