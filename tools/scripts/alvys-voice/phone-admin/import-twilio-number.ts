import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';
import { readTwilioCreds } from '../../common/props';

/**
 * Imports a Twilio-hosted number into the workspace so it can be assigned to a
 * voice agent. The workspace becomes the inbound-call handler — Twilio is
 * configured automatically to forward calls.
 */
export const importTwilioNumber = createAction({
  auth: alvysVoiceAuth,
  name: 'import_twilio_phone_number',
  displayName: 'Import Twilio Phone Number',
  description:
    'Register a Twilio number with the voice workspace. Twilio Account SID + Auth Token must be set on the connection.',
  props: {
    phoneNumber: Property.ShortText({
      displayName: 'Phone Number (E.164)',
      description: 'Twilio number to import, in E.164 format (e.g. +15551234567).',
      required: true,
    }),
    label: Property.ShortText({
      displayName: 'Label',
      description: 'Friendly label shown in the workspace.',
      required: true,
    }),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    const { sid, token } = readTwilioCreds(auth);
    const response = await client.conversationalAi.phoneNumbers.create({
      provider: 'twilio',
      phoneNumber: propsValue.phoneNumber,
      label: propsValue.label,
      sid,
      token,
    });
    return response;
  },
});
