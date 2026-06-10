/**
 * Auth-shape helpers. The Alvys Intelligence connection stores credentials for
 * the document pipeline + global safety policy. Chat actions resolve their
 * model via the platform-configured Alvys Intelligence AI Provider, so no chat
 * keys are stored here.
 */

export type AlvysIntelligenceAuthProps = {
  environment: string;
  documentKey?: string;
  documentBaseUrl?: string;
};

export function readAuthProps(input: unknown): AlvysIntelligenceAuthProps {
  const v = (input ?? {}) as Record<string, unknown>;
  const props = (v['props'] ?? v) as Record<string, unknown>;
  return {
    environment: String(props['environment'] ?? 'production'),
    documentKey: props['documentKey'] as string | undefined,
    documentBaseUrl: props['documentBaseUrl'] as string | undefined,
  };
}
