import { createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';

export const listPhoneNumbers = createAction({
  auth: alvysVoiceAuth,
  name: 'list_phone_numbers',
  displayName: 'List Phone Numbers',
  description: 'List every phone number imported into the workspace.',
  props: {},
  async run({ auth }) {
    const client = createVoiceClient(auth);
    return client.conversationalAi.phoneNumbers.list();
  },
});
