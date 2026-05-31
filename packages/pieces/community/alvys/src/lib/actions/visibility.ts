import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const getInboundVisibilityHistoryAction = createAction({
  auth: alvysAuth,
  name: 'visibility_inbound_history',
  displayName: 'Get Inbound Visibility History',
  description: 'Returns the inbound visibility history for a load number.',
  props: {
    version: versionProp,
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
      path: buildPath({
        version,
        path: `/visibility/inbound/${encodeURIComponent(loadNumber)}/history`,
      }),
    });
  },
});

export const getOutboundVisibilityHistoryAction = createAction({
  auth: alvysAuth,
  name: 'visibility_outbound_history',
  displayName: 'Get Outbound Visibility History',
  description: 'Returns the outbound visibility history for a load number.',
  props: {
    version: versionProp,
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
      path: buildPath({
        version,
        path: `/visibility/outbound/${encodeURIComponent(loadNumber)}/history`,
      }),
    });
  },
});

export const searchOutboundVisibilityErrorsAction = createAction({
  auth: alvysAuth,
  name: 'visibility_outbound_errors',
  displayName: 'Search Outbound Visibility Errors',
  description: 'POST /visibility/outbound/errors with an arbitrary JSON filter body.',
  props: {
    version: versionProp,
    body: Property.Json({
      displayName: 'Request Body',
      required: false,
      defaultValue: {},
    }),
  },
  async run(context) {
    const { version, body } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/visibility/outbound/errors' }),
      body: body ?? {},
    });
  },
});
