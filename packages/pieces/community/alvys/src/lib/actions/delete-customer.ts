import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const deleteCustomerAction = createAction({
  auth: alvysAuth,
  name: 'delete_customer',
  displayName: 'Delete Customer',
  description: 'Delete a customer by id.',
  props: {
    version: versionProp,
    customerId: Property.ShortText({
      displayName: 'Customer Id',
      required: true,
    }),
  },
  async run(context) {
    const { version, customerId } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.DELETE,
      path: buildPath({
        version,
        path: `/customers/${encodeURIComponent(customerId)}`,
      }),
    });
  },
});
