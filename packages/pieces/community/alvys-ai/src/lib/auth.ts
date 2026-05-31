import { PieceAuth } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysRequest, buildPath } from './common/client';

export const alvysAiAuth = PieceAuth.SecretText({
  displayName: 'Alvys API Token',
  description: `
JWT bearer token used to access the Alvys Public API. **Reuse the same token across all Alvys sub-pieces.**

1. Sign in to Alvys.
2. Settings → Integrations → API.
3. Generate or copy a Public API token.
4. Paste here.
  `,
  required: true,
  validate: async ({ auth }) => {
    try {
      await alvysRequest({
        token: auth,
        method: HttpMethod.GET,
        path: buildPath({ path: '/webhooks/event-types' }),
      });
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid Alvys API token — authentication failed.' };
    }
  },
});
