import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { AppConnectionType } from '@activepieces/shared';

import { AlvysVoiceResidency } from './common/types';
import { createVoiceClient, regionBaseUrl } from './common/client';

const description = `
Alvys Voice credentials. In most embedded deployments this connection is
**auto-provisioned for your project by your administrator** — you should not
need to fill it in.

The administrator also pre-populates default agent ids + caller phone-number id
so flow authors don't need to pick them every time. The runtime actions fall
back to these defaults when the corresponding step prop is left blank.
`;

export const alvysVoiceAuth = PieceAuth.CustomAuth({
  required: true,
  description,
  props: {
    region: Property.StaticDropdown<AlvysVoiceResidency>({
      displayName: 'Residency',
      description: 'Region for voice generation.',
      required: true,
      defaultValue: 'default',
      options: {
        placeholder: 'Select your account region...',
        options: [
          { label: `Default — ${regionBaseUrl('default')}`, value: 'default' },
          { label: `US — ${regionBaseUrl('us')}`, value: 'us' },
          { label: `EU — ${regionBaseUrl('eu')}`, value: 'eu' },
        ],
      },
    }),
    apiKey: PieceAuth.SecretText({
      displayName: 'API Key',
      description: 'Alvys Voice API key.',
      required: true,
    }),
    twilioAccountSid: Property.ShortText({
      displayName: 'Twilio Account SID',
      description:
        'Twilio campaign SID resolved by the embedder backend. Falls back to the Alvys-managed campaign if the tenant has not registered one.',
      required: false,
    }),
    twilioAuthToken: PieceAuth.SecretText({
      displayName: 'Twilio Auth Token',
      description: 'Paired with the SID above.',
      required: false,
    }),
    defaultInboundAgentId: Property.ShortText({
      displayName: 'Default Inbound Agent ID',
      description:
        'Pre-provisioned agent that answers calls on the default phone number. Set by the embedder backend at project creation.',
      required: false,
    }),
    defaultOutboundAgentId: Property.ShortText({
      displayName: 'Default Outbound Agent ID',
      description:
        'Pre-provisioned agent used by the Place Outbound Call action when no agent override is set on the step.',
      required: false,
    }),
    defaultPhoneNumberId: Property.ShortText({
      displayName: 'Default Caller Phone Number ID',
      description:
        'Phone number used as caller-ID for outbound calls when no override is set on the step.',
      required: false,
    }),
  },
  validate: async ({ auth }) => {
    try {
      const client = createVoiceClient({
        type: AppConnectionType.CUSTOM_AUTH,
        props: auth,
      });
      await client.user.get();
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid API key or residency.',
      };
    }
  },
});
