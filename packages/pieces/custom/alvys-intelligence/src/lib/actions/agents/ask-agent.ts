import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysIntelligenceAuth } from '../../auth';
import { rateLimiter } from '../../runtime/rate-limiter';
import { circuitBreaker } from '../../runtime/circuit-breaker';
import { safety } from '../../runtime/safety';
import {
  resolveEffectiveConfig,
  readConnectionConfigOverrides,
} from '../../runtime/effective-config';
import { advancedProp, readStepAdvanced } from '../common/advanced-prop';
import { alvysChatApi } from '../../common/chat-api';

const AUTO_MODEL = '__auto__';

export const askAgent = createAction({
  auth: alvysIntelligenceAuth,
  name: 'ask_agent',
  displayName: 'Ask Agent',
  description:
    'Ask a Snowflake Cortex Agent through the Alvys Insights chat API. Tools, knowledge, and instructions come from the agent configuration; protected by Agent Shield.',
  props: {
    agentName: Property.Dropdown<string, true, typeof alvysIntelligenceAuth>({
      auth: alvysIntelligenceAuth,
      displayName: 'Agent',
      description: 'Cortex Agent available to your tenant.',
      required: true,
      refreshers: [],
      options: async ({ auth }) => {
        try {
          const connection = alvysChatApi.readChatConnection(auth);
          const agents = await alvysChatApi.listAgents(connection);
          if (agents.length === 0) {
            return {
              disabled: true,
              options: [],
              placeholder: 'No agents available for your tenant.',
            };
          }
          return {
            disabled: false,
            options: agents.map((agent) => ({
              label: agent.description ? `${agent.name} — ${agent.description}` : agent.name,
              value: agent.name,
            })),
          };
        } catch (err) {
          return {
            disabled: true,
            options: [],
            placeholder: err instanceof Error ? err.message : 'Failed to list agents.',
          };
        }
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description:
        'What you want the agent to do. Sensitive values are redacted per the active safety policy.',
      required: true,
    }),
    model: Property.Dropdown<string, false, typeof alvysIntelligenceAuth>({
      auth: alvysIntelligenceAuth,
      displayName: 'Model',
      description: 'Auto uses the agent default; pick a model to override for this run.',
      required: false,
      defaultValue: AUTO_MODEL,
      refreshers: [],
      options: async ({ auth }) => {
        const autoOption = { label: 'Auto (agent default)', value: AUTO_MODEL };
        try {
          const connection = alvysChatApi.readChatConnection(auth);
          const models = await alvysChatApi.listModels(connection);
          return {
            disabled: false,
            options: [
              autoOption,
              ...models.map((model) => ({ label: model.label || model.id, value: model.id })),
            ],
          };
        } catch {
          return { disabled: false, options: [autoOption] };
        }
      },
    }),
    threadId: Property.ShortText({
      displayName: 'Thread ID',
      description:
        'Continue an existing Insights chat thread. Leave blank to start a new thread for this run.',
      required: false,
    }),
    advanced: advancedProp,
  },
  async run(context) {
    const connection = alvysChatApi.readChatConnection(context.auth);
    const agentName = context.propsValue.agentName;

    const config = await resolveEffectiveConfig({
      store: context.store,
      apiUrl: context.server.apiUrl,
      serverToken: context.server.token,
      connectionConfig: readConnectionConfigOverrides(context.auth),
      stepConfig: readStepAdvanced(context.propsValue.advanced),
    });

    const tenantKey = context.project.id;
    const rl = await rateLimiter.checkAndIncrement({
      store: context.store,
      storeKey: `alvys.intelligence.${tenantKey}.rl.agent`,
      config: {
        maxRequests: config.rateLimitMaxRequests,
        windowMs: config.rateLimitWindowSec * 1000,
      },
    });
    if (!rl.allowed) {
      throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`);
    }

    const breakerKey = `alvys.intelligence.${tenantKey}.cb.agent`;
    const breakerConfig = {
      failureThreshold: config.circuitFailureThreshold,
      recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
    };
    const breaker = await circuitBreaker.checkAllowed({
      store: context.store,
      storeKey: breakerKey,
      config: breakerConfig,
    });
    if (!breaker.allowed) {
      throw new Error('Alvys Intelligence is temporarily unavailable. Retry shortly.');
    }

    const prompt = context.propsValue.prompt;
    const redactedPrompt =
      config.safetyMode === 'off' ? prompt : safety.redactOutbound(prompt).redacted;
    const outboundRedactions =
      config.safetyMode === 'off' ? 0 : safety.redactOutbound(prompt).findings.length;

    const modelChoice = context.propsValue.model;
    const llmModel = modelChoice && modelChoice !== AUTO_MODEL ? modelChoice : undefined;

    let result;
    let threadId = context.propsValue.threadId?.trim() || undefined;
    try {
      if (!threadId) {
        threadId = await alvysChatApi.createThread(connection);
      }
      const parentKey = `alvys-intel-chat-thread:${threadId}`;
      const parentMessageId = (await context.store.get<number>(parentKey)) ?? 0;

      result = await alvysChatApi.askAgent({
        connection,
        threadId,
        agentName,
        messages: [{ role: 'user', content: redactedPrompt }],
        parentMessageId,
        llmModel,
        onText: async (accumulated) => {
          await context.output.update({ data: { text: accumulated } });
        },
      });

      if (typeof result.assistantMessageId === 'number') {
        await context.store.put(parentKey, result.assistantMessageId);
      }
      await circuitBreaker.recordSuccess({ store: context.store, storeKey: breakerKey });
    } catch (err) {
      await circuitBreaker.recordFailure({
        store: context.store,
        storeKey: breakerKey,
        config: breakerConfig,
      });
      throw err;
    }

    let outboundText = result.text;
    let promptInjectionsDetected = 0;
    let flagged = false;
    if (config.safetyMode !== 'off') {
      const findings = safety.scanInboundForInjection(outboundText);
      promptInjectionsDetected = findings.length;
      if (findings.length > 0) {
        if (config.promptInjectionAction === 'block') {
          outboundText = '[blocked: prompt-injection detected in agent output]';
          flagged = true;
        } else if (config.promptInjectionAction === 'warn') {
          flagged = true;
        }
      }
    }

    return {
      agent: agentName,
      threadId,
      text: outboundText,
      attachments: result.attachments,
      citations: result.citations,
      thinkingSteps: result.thinkingSteps,
      safety: {
        mode: config.safetyMode,
        outboundRedactions,
        promptInjectionsDetected,
        promptInjectionAction: config.promptInjectionAction,
        flagged,
      },
      rateLimit: { remaining: rl.remaining, total: rl.total },
    };
  },
});
