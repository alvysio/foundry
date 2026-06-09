import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../../auth';
import { createVoiceClient } from '../../common/client';

/**
 * Place an outbound voice call via Twilio. Uses an imported phone number as
 * the caller and a configured agent for the dialog.
 *
 * Agent + caller phone number are read from the connection's defaults if
 * left blank on the step. This keeps the flow author UX minimal — they only
 * specify the destination number + any per-call dynamic variables.
 *
 * `dynamicVariables` are interpolated into the agent's prompt + first message
 * at runtime — useful for per-call context (e.g. driver name, load number).
 */
export const outboundCall = createAction({
  auth: alvysVoiceAuth,
  name: 'outbound_call',
  displayName: 'Place Outbound Call',
  description: 'Place an outbound voice call to a number using an Alvys Voice agent.',
  props: {
    toNumber: Property.ShortText({
      displayName: 'To Number (E.164)',
      description: 'Destination phone number in E.164 format.',
      required: true,
    }),
    dynamicVariables: Property.Object({
      displayName: 'Dynamic Variables (Optional)',
      description:
        'Key/value map interpolated into the agent prompt and first message at runtime (e.g. {{driverName}}, {{loadId}}).',
      required: false,
    }),
    agentIdOverride: Property.ShortText({
      displayName: 'Agent ID Override (Optional)',
      description:
        'Override the connection default. Leave blank to use the connection\'s Default Outbound Agent ID.',
      required: false,
    }),
    fromPhoneNumberIdOverride: Property.ShortText({
      displayName: 'Caller Phone Number ID Override (Optional)',
      description:
        'Override the connection default. Leave blank to use the connection\'s Default Caller Phone Number ID.',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const client = createVoiceClient(auth);
    const dyn = propsValue.dynamicVariables ?? {};

    const agentId = (propsValue.agentIdOverride ?? '').trim() || auth.props.defaultOutboundAgentId?.trim();
    const fromPhoneNumberId =
      (propsValue.fromPhoneNumberIdOverride ?? '').trim() || auth.props.defaultPhoneNumberId?.trim();

    if (!agentId) {
      throw new Error(
        'No agent configured. Set Default Outbound Agent ID on the connection, or supply Agent ID Override on this step.',
      );
    }
    if (!fromPhoneNumberId) {
      throw new Error(
        'No caller phone number configured. Set Default Caller Phone Number ID on the connection, or supply Caller Phone Number ID Override on this step.',
      );
    }

    return client.conversationalAi.twilio.outboundCall({
      agentId,
      agentPhoneNumberId: fromPhoneNumberId,
      toNumber: propsValue.toNumber,
      conversationInitiationClientData:
        Object.keys(dyn).length > 0
          ? ({ dynamicVariables: dyn } as never)
          : undefined,
    });
  },
});
