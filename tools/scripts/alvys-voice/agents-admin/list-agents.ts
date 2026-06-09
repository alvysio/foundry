import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';

export const listAgents = createAction({
  auth: alvysVoiceAuth,
  name: 'list_voice_agents',
  displayName: 'List Voice Agents',
  description: 'List every voice agent visible to the connected account.',
  props: {
    search: Property.ShortText({
      displayName: 'Search Term (Optional)',
      required: false,
    }),
    pageSize: Property.Number({
      displayName: 'Page Size',
      required: false,
      defaultValue: 30,
    }),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    return client.conversationalAi.agents.list({
      search: propsValue.search?.trim() || undefined,
      pageSize: propsValue.pageSize,
    });
  },
});
