import { createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';
import { agentDropdown } from '../../common/props';

export const deleteAgent = createAction({
  auth: alvysVoiceAuth,
  name: 'delete_voice_agent',
  displayName: 'Delete Voice Agent',
  description: 'Permanently delete a voice agent.',
  props: {
    agentId: agentDropdown('Agent to delete.'),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    await client.conversationalAi.agents.delete(propsValue.agentId);
    return { deleted: true, agentId: propsValue.agentId };
  },
});
