import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';

export const getConversation = createAction({
  auth: alvysVoiceAuth,
  name: 'get_conversation',
  displayName: 'Get Conversation',
  description: 'Fetch a single conversation by id — includes full transcript and analysis.',
  props: {
    conversationId: Property.ShortText({
      displayName: 'Conversation ID',
      required: true,
    }),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    return client.conversationalAi.conversations.get(propsValue.conversationId);
  },
});
