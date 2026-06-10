import { createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';
import { agentDropdown, phoneNumberDropdown } from '../../common/props';

/**
 * Binds a voice agent to an imported phone number. Inbound calls to that
 * number will be answered by the chosen agent.
 */
export const assignAgentToNumber = createAction({
  auth: alvysVoiceAuth,
  name: 'assign_agent_to_phone_number',
  displayName: 'Assign Agent to Phone Number',
  description: 'Route all inbound calls on a phone number to a specific voice agent.',
  props: {
    phoneNumberId: phoneNumberDropdown(),
    agentId: agentDropdown('Agent that answers calls on this number.'),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    return client.conversationalAi.phoneNumbers.update(propsValue.phoneNumberId, {
      agentId: propsValue.agentId,
    });
  },
});
