import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod, QueryParams } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const listCustomersAction = createAction({
  auth: alvysAuth,
  name: 'list_customers',
  displayName: 'List Customers',
  description: 'GET /customers with optional query lookups.',
  props: {
    version: versionProp,
    id: Property.ShortText({ displayName: 'Customer Id', required: false }),
    companyNumber: Property.ShortText({
      displayName: 'Company Number',
      required: false,
    }),
    externalId: Property.ShortText({
      displayName: 'External Id',
      required: false,
    }),
  },
  async run(context) {
    const { version, id, companyNumber, externalId } = context.propsValue;
    const queryParams: QueryParams = {};
    if (id) queryParams['id'] = id;
    if (companyNumber) queryParams['companyNumber'] = companyNumber;
    if (externalId) queryParams['externalId'] = externalId;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({ version, path: '/customers' }),
      queryParams,
    });
  },
});
