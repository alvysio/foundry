import { PieceAuth } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysRequest, buildPath } from './common/client';

export const alvysAuth = PieceAuth.SecretText({
  displayName: 'API Token',
  description: `
JWT bearer token used to access the Alvys Public API.

1. Sign in to Alvys.
2. Go to **Settings → Integrations → API**.
3. Generate or copy an existing **Public API token**.
4. Paste the token here. Alvys sends it as \`Authorization: Bearer <token>\`.
  `,
  required: true,
  validate: async ({ auth }) => {
    try {
      await alvysRequest({
        token: auth,
        method: HttpMethod.GET,
        path: buildPath({ path: '/users/list' }),
      });
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid Alvys API token — authentication failed.',
      };
    }
  },
});
