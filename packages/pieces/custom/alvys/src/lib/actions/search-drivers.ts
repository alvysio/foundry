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

export const searchDriversAction = createAction({
  auth: alvysAuth,
  name: 'search_drivers',
  displayName: 'Find Drivers',
  description: 'Search drivers with pagination and arbitrary filters.',
  props: {
    version: versionProp,
    ...paginationProps,
    additional: searchBodyProp,
  },
  async run(context) {
    const { version, page, pageSize, includeDeleted, additional } =
      context.propsValue;
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/drivers/search' }),
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
