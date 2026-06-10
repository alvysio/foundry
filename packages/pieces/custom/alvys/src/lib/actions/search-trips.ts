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

export const searchTripsAction = createAction({
  auth: alvysAuth,
  name: 'search_trips',
  displayName: 'Find Trips',
  description:
    'Search trips by status, load/trip numbers, last-updater, or pickup / delivery / updated-at date ranges. At least one filter is required.',
  props: {
    version: versionProp,
    ...paginationProps,
    status: Property.Array({
      displayName: 'Status',
      description:
        'Trip status values (e.g. "In Transit", "Dispatched", "Completed"). See Alvys docs for the full enum.',
      required: false,
    }),
    loadNumbers: Property.Array({
      displayName: 'Load Numbers',
      description: 'Filter trips that belong to these load numbers.',
      required: false,
    }),
    tripNumbers: Property.Array({
      displayName: 'Trip Numbers',
      description: 'Filter by specific trip numbers.',
      required: false,
    }),
    updatedBy: Property.ShortText({
      displayName: 'Updated By',
      description: 'User id of the last modifier.',
      required: false,
    }),
    pickupDateRangeFrom: Property.DateTime({
      displayName: 'Pickup Date Range Start',
      required: false,
    }),
    pickupDateRangeTo: Property.DateTime({
      displayName: 'Pickup Date Range End',
      required: false,
    }),
    deliveryDateRangeFrom: Property.DateTime({
      displayName: 'Delivery Date Range Start',
      required: false,
    }),
    deliveryDateRangeTo: Property.DateTime({
      displayName: 'Delivery Date Range End',
      required: false,
    }),
    updatedAtRangeFrom: Property.DateTime({
      displayName: 'Updated At Range Start',
      required: false,
    }),
    updatedAtRangeTo: Property.DateTime({
      displayName: 'Updated At Range End',
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
      tripNumbers,
      updatedBy,
      pickupDateRangeFrom,
      pickupDateRangeTo,
      deliveryDateRangeFrom,
      deliveryDateRangeTo,
      updatedAtRangeFrom,
      updatedAtRangeTo,
      additional,
    } = context.propsValue;
    const base: Record<string, unknown> = {
      Page: page ?? 0,
      PageSize: pageSize ?? 50,
      IncludeDeleted: includeDeleted ?? false,
    };
    if (status && status.length > 0) base['Status'] = status;
    if (loadNumbers && loadNumbers.length > 0) base['LoadNumbers'] = loadNumbers;
    if (tripNumbers && tripNumbers.length > 0) base['TripNumbers'] = tripNumbers;
    if (updatedBy) base['UpdatedBy'] = updatedBy;
    if (pickupDateRangeFrom || pickupDateRangeTo) {
      base['PickupDateRange'] = {
        ...(pickupDateRangeFrom ? { Start: pickupDateRangeFrom } : {}),
        ...(pickupDateRangeTo ? { End: pickupDateRangeTo } : {}),
      };
    }
    if (deliveryDateRangeFrom || deliveryDateRangeTo) {
      base['DeliveryDateRange'] = {
        ...(deliveryDateRangeFrom ? { Start: deliveryDateRangeFrom } : {}),
        ...(deliveryDateRangeTo ? { End: deliveryDateRangeTo } : {}),
      };
    }
    if (updatedAtRangeFrom || updatedAtRangeTo) {
      base['UpdatedAtRange'] = {
        ...(updatedAtRangeFrom ? { Start: updatedAtRangeFrom } : {}),
        ...(updatedAtRangeTo ? { End: updatedAtRangeTo } : {}),
      };
    }
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/trips/search' }),
      body: mergeSearchBody({ base, extra: additional }),
    });
  },
});
