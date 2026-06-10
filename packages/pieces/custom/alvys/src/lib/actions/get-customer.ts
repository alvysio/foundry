import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getCustomerAction = createAction({
  auth: alvysAuth,
  name: 'get_customer',
  displayName: 'Get Customer',
  description:
    'Fetch a single customer by customer id or company number. Provide exactly one of the two filters.',
  props: {
    version: versionProp,
    customerId: Property.ShortText({
      displayName: 'Customer Id',
      description:
        'Alvys-assigned customer id. Use this OR Company Number — not both.',
      required: false,
    }),
    companyNumber: Property.ShortText({
      displayName: 'Company Number',
      description:
        'Customer-facing company number. Use this OR Customer Id — not both.',
      required: false,
    }),
  },
  async run(context) {
    const { version, customerId, companyNumber } = context.propsValue;
    if (!customerId && !companyNumber) {
      throw new Error(
        'Either Customer Id or Company Number is required.',
      );
    }
    if (customerId && companyNumber) {
      throw new Error(
        'Provide only one of Customer Id or Company Number, not both.',
      );
    }
    const queryParams: Record<string, string> = {};
    if (customerId) queryParams['id'] = customerId;
    if (companyNumber) queryParams['companyNumber'] = companyNumber;
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.GET,
      path: buildPath({ version, path: '/customers' }),
      queryParams,
    });
  },
});
