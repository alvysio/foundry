import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionPropV2 } from '../common/props';

export const getLoadRateConfirmationAction = createAction({
  auth: alvysAuth,
  name: 'get_load_ratecon',
  displayName: 'Get Rate Confirmation URL',
  description:
    'Returns the customer-facing rate confirmation URL for a load. Use in auto-invoice and bill-audit workflows to match POD against the ratecon.',
  props: {
    version: versionPropV2,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
  },
  async run(context) {
    const { version, loadNumber } = context.propsValue;
    return alvysRequest<{ Url: string }>({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/Loads/${encodeURIComponent(loadNumber)}/rate-confirmation`,
      }),
    });
  },
});
