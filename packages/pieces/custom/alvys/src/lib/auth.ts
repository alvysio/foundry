import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysRequest, buildPath } from './common/client';
import { AlvysAuthValue } from './common/types';

export const alvysAuth = PieceAuth.CustomAuth({
  description: `
Alvys API credentials. In most embedded deployments this connection is
**auto-provisioned for your project by your administrator** — you should not
need to fill it in. If you do, follow these steps:

1. Go to **Settings → Integrations → API** in Alvys.
2. Create a new **Public API Client** (or reuse an existing one).
3. Copy the **Client ID** and **Client Secret**.
4. Paste them here. Tokens are exchanged for short-lived bearers automatically
   and refreshed in-flight on 401/403 (OAuth2 client_credentials grant per
   https://docs.alvys.com/docs/authentication-1).
  `,
  required: true,
  props: {
    environment: Property.StaticDropdown({
      displayName: 'Environment',
      description: 'Production (api.alvys.com) or QA (qaapi.alvys.net).',
      required: true,
      defaultValue: 'production',
      options: {
        options: [
          { label: 'Production', value: 'production' },
          { label: 'QA', value: 'qa' },
        ],
      },
    }),
    clientId: Property.ShortText({
      displayName: 'Client ID',
      description: 'OAuth2 client_id issued in Alvys Settings → Integrations → API.',
      required: true,
    }),
    clientSecret: PieceAuth.SecretText({
      displayName: 'Client Secret',
      description: 'OAuth2 client_secret issued alongside the Client ID.',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    const value = auth as AlvysAuthValue;
    try {
      await alvysRequest({
        auth: value,
        method: HttpMethod.GET,
        path: buildPath({ path: '/users/list' }),
      });
      return { valid: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `Authentication failed — could not exchange client credentials or reach Alvys API. ${msg.slice(0, 200)}`,
      };
    }
  },
});
