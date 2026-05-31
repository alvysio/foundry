import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getLoadByNumberAction = createAction({
  auth: alvysAuth,
  name: 'get_load_by_number',
  displayName: 'Get Load by Number',
  description:
    'Hydrate a single load by its business load number. Returns the load record or null when not found.',
  props: {
    version: versionProp,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
  },
  async run(context) {
    const { version, loadNumber } = context.propsValue;
    const result = await alvysRequest<unknown>({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({ version, path: '/loads' }),
      queryParams: { loadNumber },
    });
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    return null;
  },
});
