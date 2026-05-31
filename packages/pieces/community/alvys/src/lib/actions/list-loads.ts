import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod, QueryParams } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const listLoadsAction = createAction({
  auth: alvysAuth,
  name: 'list_loads',
  displayName: 'List Loads',
  description: 'Fetch loads via simple GET lookups by id, load number or order number.',
  props: {
    version: versionProp,
    id: Property.ShortText({ displayName: 'Load Id', required: false }),
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: false,
    }),
    orderNumber: Property.ShortText({
      displayName: 'Order Number',
      required: false,
    }),
  },
  async run(context) {
    const { version, id, loadNumber, orderNumber } = context.propsValue;
    const queryParams: QueryParams = {};
    if (id) queryParams['id'] = id;
    if (loadNumber) queryParams['loadNumber'] = loadNumber;
    if (orderNumber) queryParams['orderNumber'] = orderNumber;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({ version, path: '/loads' }),
      queryParams,
    });
  },
});
