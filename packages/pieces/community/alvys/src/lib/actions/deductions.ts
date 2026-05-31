import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const createOneTimeDeductionAction = createAction({
  auth: alvysAuth,
  name: 'create_one_time_deduction',
  displayName: 'Create One-Time Deduction',
  description: 'POST /deductions/once with a free-form JSON body.',
  props: {
    version: versionProp,
    body: Property.Json({
      displayName: 'Request Body',
      description: 'JSON payload matching the OneTimeDeductionRequest schema.',
      required: true,
    }),
  },
  async run(context) {
    const { version, body } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/deductions/once' }),
      body,
    });
  },
});

export const deleteDeductionAction = createAction({
  auth: alvysAuth,
  name: 'delete_deduction',
  displayName: 'Delete Deduction',
  description: 'Delete a deduction by id.',
  props: {
    version: versionProp,
    deductionId: Property.ShortText({
      displayName: 'Deduction Id',
      required: true,
    }),
  },
  async run(context) {
    const { version, deductionId } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.DELETE,
      path: buildPath({
        version,
        path: `/deductions/${encodeURIComponent(deductionId)}`,
      }),
    });
  },
});
