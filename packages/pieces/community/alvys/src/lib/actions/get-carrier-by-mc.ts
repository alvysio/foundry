import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getCarriersByMcAction = createAction({
  auth: alvysAuth,
  name: 'get_carriers_by_mc',
  displayName: 'Find Carriers by MC Number',
  description:
    'Look up carriers by Motor Carrier (MC) number. Used in carrier sourcing and vetting workflows. Returns a list since MC numbers can match multiple records.',
  props: {
    version: versionProp,
    mcNumber: Property.ShortText({
      displayName: 'MC Number',
      required: true,
    }),
  },
  async run(context) {
    const { version, mcNumber } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/Carriers/by-mc/${encodeURIComponent(mcNumber)}`,
      }),
    });
  },
});
