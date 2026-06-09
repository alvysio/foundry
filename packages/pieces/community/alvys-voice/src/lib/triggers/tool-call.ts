import { Property, TriggerStrategy, createTrigger } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../auth';

/**
 * Fires every time the agent invokes this flow as a tool during a live
 * conversation. The flow's final step output is returned to the agent in real
 * time, allowing intent-driven routing — e.g. "lookup load", "transfer to
 * human", "send SMS" — to live in Activepieces while the agent decides when
 * to call which tool.
 *
 * Register one tool per intent on the agent. Each tool's webhook URL points
 * to a separate flow that uses this trigger; the agent's tool definition
 * names + parameters become \`payload.body.parameters\` here.
 */
export const toolCallTrigger = createTrigger({
  auth: alvysVoiceAuth,
  name: 'tool_call',
  displayName: 'Tool Invoked by Agent',
  description:
    'Fires synchronously when a voice agent invokes this flow as a tool. The flow output is returned to the agent as the tool result.',
  type: TriggerStrategy.WEBHOOK,
  props: {
    instructions: Property.MarkDown({
      value: `
To bind this trigger as a tool the agent can invoke:

1. Open the Alvys Voice admin console.
2. Open the agent that should call this flow.
3. Under **Tools → Add Tool**, choose **Webhook**.
4. Name the tool (this becomes the intent the agent recognizes — e.g.
   \`lookup_load\`, \`transfer_to_human\`).
5. Describe when the agent should call it (the LLM uses this to route).
6. Define the parameters the agent should collect from the caller.
7. Paste this URL into **URL**:
   \`\`\`
   {{webhookUrl}}/sync
   \`\`\`
   The \`/sync\` suffix is critical — it makes the agent wait for the flow's
   output before continuing the conversation.
8. Set **Method** to **POST**.
9. Save.

The agent will now POST to this URL with the parameters it collected. The
flow's last step is returned as the tool result and spoken back through the
agent.
      `,
    }),
  },
  sampleData: {
    parameters: { load_id: '12345', driver_phone: '+15551234567' },
    callId: 'conv_xxx',
    agentId: 'agent_xxx',
    timestamp: 1700000000,
  },
  async onEnable() {
    // No-op — webhook URL is pasted into agent tool config manually.
  },
  async onDisable() {
    // No-op — paired with onEnable.
  },
  async run({ payload }) {
    return [payload.body];
  },
});
