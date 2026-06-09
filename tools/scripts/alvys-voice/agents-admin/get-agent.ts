import { createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';
import { agentDropdown } from '../../common/props';

export const getAgent = createAction({
  auth: alvysVoiceAuth,
  name: 'get_voice_agent',
  displayName: 'Get Voice Agent',
  description: 'Fetch the full configuration for a voice agent.',
  props: {
    agentId: agentDropdown(),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    return client.conversationalAi.agents.get(propsValue.agentId);
  },
});
