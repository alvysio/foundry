import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getCarrierInsuranceAction = createAction({
  auth: alvysAuth,
  name: 'get_carrier_insurance',
  displayName: 'Get Carrier Insurance',
  description:
    'Returns the active insurance policy for a carrier (type, policy number, dates, coverage amount, status). Used in carrier vetting and compliance workflows.',
  props: {
    version: versionProp,
    carrierId: Property.ShortText({
      displayName: 'Carrier Id',
      required: true,
    }),
  },
  async run(context) {
    const { version, carrierId } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.GET,
      path: buildPath({
        version,
        path: `/Carriers/${encodeURIComponent(carrierId)}/insurance`,
      }),
    });
  },
});
