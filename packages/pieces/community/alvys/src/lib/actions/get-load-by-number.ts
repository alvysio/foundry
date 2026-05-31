import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionPropV2 } from '../common/props';

export const getLoadByNumberAction = createAction({
  auth: alvysAuth,
  name: 'get_load_by_number',
  displayName: 'Get Load',
  description:
    'Hydrate a single load by its business load number. Returns the LoadResponse projection from the public API.',
  props: {
    version: versionPropV2,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
  },
  async run(context) {
    const { version, loadNumber } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({ version, path: '/Loads' }),
      queryParams: { loadNumber },
    });
  },
});
