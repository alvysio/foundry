import { AIProviderName } from '@activepieces/shared';
import { t } from 'i18next';

export const SUPPORTED_AI_PROVIDERS: AiProviderInfo[] = [
  {
    provider: AIProviderName.ANTHROPIC,
    name: 'Anthropic',
    markdown: t(`Follow these instructions to get your Claude API Key:

1. Go to https://console.anthropic.com/settings/keys.
2. Once on the website, locate and click on the option to obtain your Claude API Key.
`),
    logoUrl: 'https://cdn.activepieces.com/pieces/claude.png',
  },
  {
    provider: AIProviderName.BEDROCK,
    name: 'AWS Bedrock',
    logoUrl: 'https://cdn.activepieces.com/pieces/amazon-bedrock.png',
    markdown: t(`Connect your AWS account to use Amazon Bedrock AI models.

1. Open the [AWS IAM Console](https://console.aws.amazon.com/iam/) and go to **Users**.
2. Select your user (or create a new one), then go to **Security credentials**.
3. Click **Create access key** — copy both the Access Key ID and Secret Access Key.
4. Attach a policy granting only the Bedrock actions this integration uses: \`bedrock:ListFoundationModels\`, \`bedrock:ListInferenceProfiles\`, \`bedrock:InvokeModel\`, and \`bedrock:InvokeModelWithResponseStream\`. Avoid broad policies like **AmazonBedrockFullAccess** — follow least-privilege so a leaked key has limited blast radius.
5. In the [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/), go to **Model access** and request access to the models you want to use.`),
  },
  {
    provider: AIProviderName.AZURE,
    name: 'Azure',
    logoUrl: 'https://cdn.activepieces.com/pieces/azure-openai.png',
    markdown: t(
      'Use the Azure Portal to browse to your OpenAI resource and retrieve an API key and resource name.',
    ),
  },
  {
    provider: AIProviderName.CLOUDFLARE_GATEWAY,
    name: 'Cloudflare AI Gateway',
    logoUrl: 'https://cdn.activepieces.com/pieces/cloudflare-gateway.png',
    markdown:
      t(`Follow these instructions to get your Cloudflare AI Gateway API Key:
1. Go to https://developers.cloudflare.com/ai-gateway/get-started/ to create your gateway then enter it from the dashboard.
2. Look in the overview section for this link https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/ to get your account id and gateway id.
3. Create an AI Gateway Token by checking https://developers.cloudflare.com/ai-gateway/configuration/authentication/#setting-up-authenticated-gateway-using-the-dashboard.
4. In your gateway dashboard, go to the providers tab and add your API keys for each provider.
5. After you finish all the previous steps and filled the required inputs, add models but make sure you prefix the model id with the provider name i.e (openai/gpt-4o) or (anthropic/claude-3-5-sonnet), check https://developers.cloudflare.com/ai-gateway/usage/chat-completion/ for more information.`),
  },
  {
    provider: AIProviderName.GOOGLE,
    name: 'Google Gemini',
    markdown: t(`Follow these instructions to get your Google API Key:
1. Go to https://console.cloud.google.com/apis/credentials.
2. Once on the website, locate and click on the option to obtain your Google API Key.
`),
    logoUrl: 'https://cdn.activepieces.com/pieces/google-gemini.png',
  },
  {
    provider: AIProviderName.MISTRAL,
    name: 'Mistral AI',
    logoUrl: 'https://cdn.activepieces.com/pieces/mistral-ai.png',
    markdown: t(`Follow these instructions to get your Mistral AI API Key:

1. Go to https://console.mistral.ai.
2. Navigate to **API Keys** in your account settings.
3. Click **Create new key**, copy the key, and paste it below.
`),
  },
  {
    provider: AIProviderName.OPENAI,
    name: 'OpenAI',
    markdown: t(`Follow these instructions to get your OpenAI API Key:

1. Go to https://platform.openai.com/account/api-keys.
2. Once on the website, locate and click on the option to obtain your OpenAI API Key.

It is strongly recommended that you add your credit card information to your OpenAI account and upgrade to the paid plan **before** generating the API Key. This will help you prevent 429 errors.
`),
    logoUrl: 'https://cdn.activepieces.com/pieces/openai.png',
  },
  {
    provider: AIProviderName.OPENROUTER,
    name: 'OpenRouter',
    logoUrl: 'https://cdn.activepieces.com/pieces/openrouter.jpg',
    markdown: t(`Follow these instructions to get your OpenRouter API Key:
1. Go to https://openrouter.ai/settings/keys.
2. Once on the website, locate and click on the option to obtain your OpenRouter API Key.`),
  },
  {
    provider: AIProviderName.CUSTOM,
    name: 'Other (OpenAI Compatible)',
    logoUrl: 'https://cdn.activepieces.com/pieces/new-core/text-ai.svg',
    markdown:
      t(`Follow these instructions to get your OpenAI Compatible API Key:
1. Set the base url to your proxy url.
2. In the api key input, make sure to include any required prefix, i.e 'Bearer sk-****************'.
3. In the api key header, set the value of your auth header name (e.g. 'Authorization').`),
  },
  {
    provider: AIProviderName.BEDROCK,
    name: 'AWS Bedrock',
    logoUrl: 'https://cdn.activepieces.com/pieces/amazon-bedrock.png',
    markdown: t(`Connect your AWS account to use Amazon Bedrock AI models.

1. Open the [AWS IAM Console](https://console.aws.amazon.com/iam/) and go to **Users**.
2. Select your user (or create a new one), then go to **Security credentials**.
3. Click **Create access key** — copy both the Access Key ID and Secret Access Key.
4. Attach a policy granting only the Bedrock actions this integration uses: \`bedrock:ListFoundationModels\`, \`bedrock:ListInferenceProfiles\`, \`bedrock:InvokeModel\`, and \`bedrock:InvokeModelWithResponseStream\`. Avoid broad policies like **AmazonBedrockFullAccess** — follow least-privilege so a leaked key has limited blast radius.
5. In the [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/), go to **Model access** and request access to the models you want to use.`),
  },
  {
    provider: AIProviderName.ALVYS_INTELLIGENCE,
    name: 'Alvys Intelligence',
    logoUrl:
      'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgODUgODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNjIuMTQ1OCA2LjkxNDUyTDY3LjUwOSAxLjE3ODAzSDg0LjYzNDdMNzEuMjMyIDc4Ljg2MTVINDguOTkxM0w1MC4yNzU1IDcxLjQzOTFDNTAuMTEzMSA3MS41NTAzIDQ5Ljk1NiA3MS42NjM2IDQ5Ljc5ODUgNzEuNzc3TDQ5Ljc5NzUgNzEuNzc3N0M0OS41NjgxIDcxLjk0MyA0OS4zMzc3IDcyLjEwOSA0OS4wODg0IDcyLjI3MTFDNDEuOTQ0NyA3Ni45Nzg1IDMzLjcwMDIgODAgMjQuMzg3NCA4MEMxMy44NDQ0IDgwIDYuODA4NSA3NS43NzQzIDMuMjkwNTcgNjguNjQ3NUMtMC4yMzgxNTUgNjEuNTMxNiAtMC45Mjg3OTIgNTEuNzMzNiAxLjIxODY2IDM5LjI2NDRDMy40MDkyNyAyNi43NDA0IDcuMjI5MzYgMTcuMjkyOCAxMy4yMTg1IDEwLjIzMTZDMTkuMjA3NiAzLjE4MTQzIDI3LjcwMDMgMC4zODk4MTQgMzguMjMyNSAwLjAyODU0NjFDNTMuNDA0OSAtMC40OTY5MzIgNjEuNTQxNSA2LjM5OTk5IDYyLjE0NTggNi45MTQ1MloiIGZpbGw9InVybCgjZykiLz48cGF0aCBkPSJNMjAuOTg5MyAzNFY0NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMjkuOTQxOSAzMFY1MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMzguODk0NSAyNlY1NCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNDcuODQ2NyAzMFY1MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNTYuNzk5MyAzNFY0NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSItMS4zNjU0NCIgeTE9IjY2LjgwNzkiIHgyPSI4My44Nzk0IiB5Mj0iMjUuMDI3OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMC4xMSIgc3RvcC1jb2xvcj0iIzQzNEZFRiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ExNDNEMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==',
    markdown: t(`Connect to Alvys Intelligence — the Alvys-managed AI broker.

1. In Alvys, go to **Settings → Integrations → API** and copy your **Public API Token** (or generate a new one). The same token is used for OAuth2 client_credentials exchange; Alvys handles short-lived bearer rotation automatically.
2. Paste the token here.

Alvys Intelligence routes requests across multiple frontier models (Anthropic, OpenAI, Gemini) behind a tier-based capability layer (fast / balanced / smart / long-context). Safety, PII redaction, prompt-injection scanning, and usage metering are applied at the gateway.`),
  },
];

export type AiProviderInfo = {
  provider: AIProviderName;
  name: string;
  markdown: string;
  logoUrl: string;
};
