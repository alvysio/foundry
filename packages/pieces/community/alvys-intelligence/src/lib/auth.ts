import { PieceAuth, Property } from '@activepieces/pieces-framework';

/**
 * Alvys Intelligence connection.
 *
 * Holds the model-provider API keys the piece needs to fulfill requests
 * entirely inside the AP sandbox (no Alvys-managed backend service in the
 * critical path). Connection labels stay Alvys-branded; the underlying
 * provider names are never surfaced to flow authors.
 *
 * At least one chat key is required for the chat / classify / structured-data
 * actions. The document key is required for Extract Document.
 *
 * Keys are stored encrypted in the AP connection store and only the resolved
 * runtime values are read inside `context.auth.props.*`.
 */
export const alvysIntelligenceAuth = PieceAuth.CustomAuth({
  description: `
Configure Alvys Intelligence credentials. The same connection can power chat,
classification, structured-data extraction, and document extraction depending
on which fields are filled. Keys are stored encrypted; the piece never echoes
them back in flow output.
  `,
  required: true,
  props: {
    environment: Property.StaticDropdown({
      displayName: 'Environment',
      description: 'Production or QA. Routes to the matching upstream endpoints.',
      required: true,
      defaultValue: 'production',
      options: {
        options: [
          { label: 'Production', value: 'production' },
          { label: 'QA', value: 'qa' },
        ],
      },
    }),
    chatPrimaryKey: PieceAuth.SecretText({
      displayName: 'Chat Primary Key',
      description:
        'Primary model API key used for chat / classify / structured-data actions.',
      required: false,
    }),
    chatSecondaryKey: PieceAuth.SecretText({
      displayName: 'Chat Secondary Key',
      description:
        'Secondary model API key used for tier fallback when the primary provider rate-limits or errors.',
      required: false,
    }),
    chatTertiaryKey: PieceAuth.SecretText({
      displayName: 'Chat Tertiary Key',
      description: 'Tertiary fallback model API key.',
      required: false,
    }),
    documentKey: PieceAuth.SecretText({
      displayName: 'Document Intelligence Key',
      description:
        'API key for the document extraction provider. Required for Extract Document.',
      required: false,
    }),
    documentBaseUrl: Property.ShortText({
      displayName: 'Document Intelligence Endpoint (Optional)',
      description:
        'Override the document extraction endpoint. Leave blank to use the Alvys default for the selected environment.',
      required: false,
    }),
  },
});
