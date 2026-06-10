import { Property, TriggerStrategy, createTrigger } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../auth';

/**
 * Fires once per completed voice conversation. The agent calls this webhook
 * after a call ends with the full transcript, summary, evaluation results,
 * data-collection fields, and any detected intents.
 *
 * Configuration is workspace-level — paste the trigger URL into the Alvys
 * Voice admin (Settings → Webhooks → Post-call) and select the agents that
 * should send to this URL.
 */
export const postCallTrigger = createTrigger({
  auth: alvysVoiceAuth,
  name: 'post_call',
  displayName: 'After Call Completed',
  description:
    'Fires after a voice conversation ends. Payload includes transcript, summary, evaluation results, data collection, and detected intents.',
  type: TriggerStrategy.WEBHOOK,
  props: {
    instructions: Property.MarkDown({
      value: `
To wire this trigger to the Alvys Voice workspace:

1. Open the Alvys Voice admin console.
2. Navigate to **Settings → Webhooks → Post-call**.
3. Click **Add Webhook** (or edit the existing one).
4. Paste this URL into the **Webhook URL** field:
   \`\`\`
   {{webhookUrl}}
   \`\`\`
5. Save.
6. (Optional) Open each agent that should send events and bind it to this
   webhook under **Agent → Webhooks → Post-call**.

Once configured, every completed conversation triggers this flow once.
      `,
    }),
  },
  sampleData: {
    type: 'post_call_transcription',
    eventTimestamp: 1700000000,
    data: {
      agentId: 'agent_xxx',
      conversationId: 'conv_xxx',
      status: 'done',
      transcript: [
        { role: 'agent', message: 'Hi, this is dispatch. Are you ready to check in on load 12345?', timeInCallSecs: 0 },
        { role: 'user', message: 'Yes, I just left the shipper.', timeInCallSecs: 4 },
      ],
      metadata: {
        startTimeUnixSecs: 1700000000,
        callDurationSecs: 42,
        cost: 0.045,
        phoneCall: {
          direction: 'inbound',
          fromNumber: '+15551234567',
          toNumber: '+15557654321',
          callSid: 'CAxxxxxxxxxxxxxxxx',
        },
      },
      analysis: {
        callSuccessful: 'success',
        transcriptSummary: 'Driver confirmed pickup at shipper, en route to consignee.',
        evaluationCriteriaResults: {
          intent_detected: { result: 'success', rationale: 'Driver intended to confirm check-call.' },
        },
        dataCollectionResults: {
          load_id: { value: '12345', rationale: 'Provided by agent.' },
          eta_hours: { value: '4', rationale: 'Driver stated ETA.' },
        },
      },
    },
  },
  async onEnable() {
    // No-op — webhook is registered manually in the Alvys Voice admin UI.
  },
  async onDisable() {
    // No-op — paired with onEnable.
  },
  async run({ payload }) {
    return [payload.body];
  },
});
