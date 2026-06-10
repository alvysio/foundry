import { ArraySubProps, createAction, PieceAuth, Property } from '@activepieces/pieces-framework';
import {
  AgentOutputField,
  AgentPieceProps,
  AgentTaskStatus,
  AgentTool,
  AgentToolType,
  AgentKnowledgeBaseTool,
  KnowledgeBaseSourceType,
  AIProviderName,
  ExecutionToolStatus,
  TASK_COMPLETION_TOOL_NAME,
  isNil,
  normalizeToolOutputToExecuteResponse,
} from '@activepieces/shared';
import { hasToolCall, stepCountIs, streamText } from 'ai';
import { inspect } from 'util';

import {
  agentOutputBuilder,
  agentUtils,
  buildWebSearchConfig,
  buildWebSearchOptionsProperty,
  constructAgentTools,
  createAIModel,
  createEmbeddingModel,
} from '@activepieces/piece-ai';

import { alvysAiProps } from '../../common/props';
import { rateLimiter } from '../../runtime/rate-limiter';
import { circuitBreaker } from '../../runtime/circuit-breaker';
import { safety } from '../../runtime/safety';
import {
  resolveEffectiveConfig,
} from '../../runtime/effective-config';
import { advancedProp, readStepAdvanced } from '../common/advanced-prop';

const agentToolArrayItems: ArraySubProps<boolean> = {
  type: Property.ShortText({ displayName: 'Tool Type', required: true }),
  toolName: Property.ShortText({ displayName: 'Tool Name', required: true }),
  pieceMetadata: Property.Json({ displayName: 'Piece Metadata', required: false }),
  externalFlowId: Property.ShortText({ displayName: 'Flow External ID', required: false }),
  serverUrl: Property.ShortText({ displayName: 'MCP Server URL', required: false }),
  protocol: Property.ShortText({ displayName: 'Protocol', required: false }),
  auth: Property.Json({ displayName: 'Auth Configuration', required: false }),
  sourceType: Property.ShortText({ displayName: 'Source Type', required: false }),
  sourceId: Property.ShortText({ displayName: 'Source ID', required: false }),
  sourceName: Property.ShortText({ displayName: 'Source Name', required: false }),
};

export const runAgent = createAction({
  auth: PieceAuth.None(),
  name: 'run_alvys_agent',
  displayName: 'Run Alvys Agent',
  description:
    'Multi-step reasoning loop powered by Alvys Intelligence. Wraps the upstream AI agent with rate limiting, circuit-breaker resilience, and inbound prompt-injection scanning on the final transcript. Safety + rate-limit policy resolved from platform defaults plus the per-step Advanced overrides — no per-connection override here.',
  props: {
    provider: alvysAiProps.provider,
    model: alvysAiProps.model,
    [AgentPieceProps.PROMPT]: Property.LongText({
      displayName: 'Prompt',
      description: 'Describe what you want the assistant to do.',
      required: true,
    }),
    [AgentPieceProps.AGENT_TOOLS]: Property.Array({
      displayName: 'Agent Tools',
      required: false,
      properties: agentToolArrayItems,
    }),
    [AgentPieceProps.STRUCTURED_OUTPUT]: Property.Array({
      displayName: 'Structured Output',
      defaultValue: undefined,
      required: false,
      properties: {
        displayName: Property.ShortText({ displayName: 'Display Name', required: true }),
        description: Property.ShortText({ displayName: 'Description', required: false }),
        type: Property.ShortText({ displayName: 'Type', required: true }),
      },
    }),
    [AgentPieceProps.MAX_STEPS]: Property.Number({
      displayName: 'Max steps',
      description: 'The number of iterations the agent can do.',
      required: true,
      defaultValue: 20,
    }),
    [AgentPieceProps.WEB_SEARCH]: Property.Checkbox({
      displayName: 'Web Search',
      required: false,
      defaultValue: false,
    }),
    [AgentPieceProps.WEB_SEARCH_OPTIONS]: buildWebSearchOptionsProperty(
      (propsValue) => ({
        provider: propsValue['provider'] as string | undefined,
        model: propsValue['model'] as string | undefined,
      }),
      ['webSearch', 'provider', 'model'],
      { showIncludeSources: false },
    ),
    advanced: advancedProp,
  },
  async run(context) {
    const modelId = context.propsValue.model;
    if (!modelId) {
      throw new Error('Model is required.');
    }
    const provider = context.propsValue.provider as AIProviderName;
    if (!provider) {
      throw new Error('AI Provider is required.');
    }

    const config = await resolveEffectiveConfig({
      store: context.store,
      apiUrl: context.server.apiUrl,
      serverToken: context.server.token,
      connectionConfig: {},
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

    const breakerKey = `alvys.intelligence.${tenantKey}.cb.chat`;
    const breaker = await circuitBreaker.checkAllowed({
      store: context.store,
      storeKey: breakerKey,
      config: {
        failureThreshold: config.circuitFailureThreshold,
        recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
      },
    });
    if (!breaker.allowed) {
      throw new Error('Alvys Intelligence is temporarily unavailable. Retry shortly.');
    }

    const prompt = context.propsValue.prompt as string;
    const maxSteps = context.propsValue.maxSteps as number;
    const webSearchEnabled = !!context.propsValue.webSearch;
    const webSearchOptions = (context.propsValue.webSearchOptions ?? {}) as Record<string, unknown>;

    const { tools: webSearchTools, providerOptions } = buildWebSearchConfig({
      provider,
      model: modelId,
      webSearchEnabled,
      webSearchOptions: webSearchOptions as never,
    });

    let model;
    try {
      model = await createAIModel({
        modelId,
        provider,
        engineToken: context.server.token,
        apiUrl: context.server.apiUrl,
        projectId: context.project.id,
        flowId: context.flows.current.id,
        runId: context.run.id,
      });
    } catch (err) {
      await circuitBreaker.recordFailure({
        store: context.store,
        storeKey: breakerKey,
        config: {
          failureThreshold: config.circuitFailureThreshold,
          recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
        },
      });
      throw err;
    }

    const redactedPrompt =
      config.safetyMode === 'off' ? prompt : safety.redactOutbound(prompt).redacted;
    const outboundRedactions =
      config.safetyMode === 'off' ? 0 : safety.redactOutbound(prompt).findings.length;

    const outputBuilder = agentOutputBuilder(redactedPrompt);
    const hasStructuredOutput =
      !isNil(context.propsValue.structuredOutput) &&
      (context.propsValue.structuredOutput as AgentOutputField[]).length > 0;
    const structuredOutput = hasStructuredOutput
      ? (context.propsValue.structuredOutput as AgentOutputField[])
      : undefined;
    const agentTools = (context.propsValue.agentTools ?? []) as AgentTool[];

    const hasKnowledgeBaseTools = agentTools.some((t) => t.type === AgentToolType.KNOWLEDGE_BASE);
    const kbFileTools = agentTools.filter(
      (t): t is AgentKnowledgeBaseTool =>
        t.type === AgentToolType.KNOWLEDGE_BASE && t.sourceType === KnowledgeBaseSourceType.FILE,
    );
    let embeddingConfig;
    if (kbFileTools.length > 0) {
      try {
        const result = await createEmbeddingModel({
          provider,
          engineToken: context.server.token,
          apiUrl: context.server.apiUrl,
        });
        embeddingConfig = { model: result.model, providerOptions: result.providerOptions };
      } catch (err) {
        outputBuilder.addMarkdown(
          `\n\n**Warning:** Could not create embedding model for knowledge base search: ${
            err instanceof Error ? err.message : 'Unknown error'
          }\n\n`,
        );
      }
    }

    const { mcpClients, tools, toolKeyToAgentTool } = await constructAgentTools({
      context,
      agentTools,
      model,
      outputBuilder,
      structuredOutput,
      embeddingConfig,
    });
    outputBuilder.setToolMap(toolKeyToAgentTool);

    const allTools = webSearchTools ? { ...webSearchTools, ...tools } : tools;
    const errors: { type: string; message: string; details?: unknown }[] = [];

    try {
      const prompts = agentUtils.getPrompts(redactedPrompt, { hasKnowledgeBaseTools });
      const stream = streamText({
        model,
        system: prompts.system,
        prompt: prompts.prompt,
        tools: allTools,
        stopWhen: [stepCountIs(maxSteps), hasToolCall(TASK_COMPLETION_TOOL_NAME)],
        providerOptions,
        onFinish: async () => {
          await Promise.all(mcpClients.map(async (client) => client.close()));
        },
      });

      for await (const chunk of stream.fullStream) {
        try {
          switch (chunk.type) {
            case 'text-delta':
              outputBuilder.addMarkdown(chunk.text);
              break;
            case 'reasoning-delta':
              if ('text' in chunk && typeof chunk.text === 'string') {
                outputBuilder.addMarkdown(chunk.text);
              } else if ('delta' in chunk && typeof chunk.delta === 'string') {
                outputBuilder.addMarkdown(chunk.delta);
              }
              break;
            case 'tool-call':
              if (agentUtils.isTaskCompletionToolCall(chunk.toolName)) continue;
              outputBuilder.startToolCall({
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
                input: chunk.input as Record<string, unknown>,
              });
              break;
            case 'tool-result': {
              if (agentUtils.isTaskCompletionToolCall(chunk.toolName)) continue;
              const rawOutput = chunk.output;
              const toolOutput = normalizeToolOutputToExecuteResponse(rawOutput);
              if (
                toolOutput['status'] === ExecutionToolStatus.FAILED &&
                toolOutput['errorMessage']
              ) {
                outputBuilder.addMarkdown(
                  `\n\n**Error:** ${JSON.stringify(toolOutput['errorMessage'])}\n\n`,
                );
              }
              outputBuilder.finishToolCall({
                toolCallId: chunk.toolCallId,
                output: toolOutput,
              });
              break;
            }
            case 'tool-error':
              errors.push({
                type: 'tool-error',
                message: `Tool ${chunk.toolName} failed`,
                details: chunk.error,
              });
              outputBuilder.failToolCall({ toolCallId: chunk.toolCallId });
              break;
            case 'error':
              errors.push({
                type: 'stream-error',
                message: 'Error during streaming',
                details: inspect(chunk.error),
              });
              break;
            default:
              break;
          }
          await context.output.update({ data: outputBuilder.build() });
        } catch (innerError) {
          const details =
            innerError instanceof Error
              ? `${innerError.message}${innerError.stack ? `\n${innerError.stack}` : ''}`
              : inspect(innerError);
          errors.push({
            type: 'chunk-processing-error',
            message: `Error processing chunk (type=${chunk.type})`,
            details,
          });
        }
      }

      if (!outputBuilder.hasTextContent()) {
        try {
          const accumulated = await stream.text;
          if (accumulated?.trim()) {
            outputBuilder.addMarkdown(accumulated);
            await context.output.update({ data: outputBuilder.build() });
          }
        } catch {
          // ignore
        }
      }

      if (errors.length > 0) {
        const summary = errors
          .map((e) => `${e.type}: ${e.message}${e.details != null ? `\n  ${String(e.details)}` : ''}`)
          .join('\n');
        outputBuilder.addMarkdown(`\n\n**Errors encountered:**\n${summary}`);
        outputBuilder.fail({ message: 'Agent completed with errors' });
      } else {
        outputBuilder.setStatus(AgentTaskStatus.COMPLETED);
      }

      await circuitBreaker.recordSuccess({ store: context.store, storeKey: breakerKey });
    } catch (error) {
      await circuitBreaker.recordFailure({
        store: context.store,
        storeKey: breakerKey,
        config: {
          failureThreshold: config.circuitFailureThreshold,
          recoveryWindowMs: config.circuitRecoveryWindowSec * 1000,
        },
      });
      const message = `Agent failed unexpectedly: ${inspect(error)}`;
      outputBuilder.fail({ message });
      await context.output.update({ data: outputBuilder.build() });
      await Promise.all(mcpClients.map(async (client) => client.close()));
    }

    const built = outputBuilder.build();
    const transcript = JSON.stringify(built);
    let promptInjectionsDetected = 0;
    let flagged = false;
    if (config.safetyMode !== 'off') {
      const findings = safety.scanInboundForInjection(transcript);
      promptInjectionsDetected = findings.length;
      if (findings.length > 0) {
        if (config.promptInjectionAction === 'block') {
          outputBuilder.fail({ message: '[blocked: prompt-injection detected in agent output]' });
          flagged = true;
        } else if (config.promptInjectionAction === 'warn') {
          flagged = true;
        }
      }
    }

    return {
      ...outputBuilder.build(),
      safety: {
        mode: config.safetyMode,
        outboundRedactions,
        promptInjectionsDetected,
        promptInjectionAction: config.promptInjectionAction,
        flagged,
      },
      rateLimit: { remaining: rl.remaining, total: rl.total },
      effectiveConfigSummary: {
        rateLimitMaxRequests: config.rateLimitMaxRequests,
        rateLimitWindowSec: config.rateLimitWindowSec,
        circuitFailureThreshold: config.circuitFailureThreshold,
        circuitRecoveryWindowSec: config.circuitRecoveryWindowSec,
      },
    };
  },
});
