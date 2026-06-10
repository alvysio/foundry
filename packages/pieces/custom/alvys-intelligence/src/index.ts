import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { alvysIntelligenceAuth } from './lib/auth';
import { extractDocument } from './lib/actions/document/extract-document';
import { classifyDocument } from './lib/actions/document/classify-document';
import { routeDocument } from './lib/actions/document/route-document';
import { askAlvysAi } from './lib/actions/chat/ask-alvys-ai';
import { summarizeText } from './lib/actions/text/summarize-text';
import { classifyText } from './lib/actions/utility/classify-text';
import { runAgent } from './lib/actions/agents/run-agent';

export const alvysIntelligence = createPiece({
  displayName: 'Alvys Intelligence',
  description:
    'Alvys-branded AI surface — chat (Ask, Summarize, Classify, Extract Structured Data) on top of the platform-configured Alvys Intelligence AI Provider, plus document classify / route / extract. All actions are wrapped with PII redaction, prompt-injection scanning, sliding-window rate limit, and a per-tenant circuit breaker. Policy applies platform default → connection override → per-step override.',
  auth: alvysIntelligenceAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl:
    'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgODUgODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNjIuMTQ1OCA2LjkxNDUyTDY3LjUwOSAxLjE3ODAzSDg0LjYzNDdMNzEuMjMyIDc4Ljg2MTVINDguOTkxM0w1MC4yNzU1IDcxLjQzOTFDNTAuMTEzMSA3MS41NTAzIDQ5Ljk1NiA3MS42NjM2IDQ5Ljc5ODUgNzEuNzc3TDQ5Ljc5NzUgNzEuNzc3N0M0OS41NjgxIDcxLjk0MyA0OS4zMzc3IDcyLjEwOSA0OS4wODg0IDcyLjI3MTFDNDEuOTQ0NyA3Ni45Nzg1IDMzLjcwMDIgODAgMjQuMzg3NCA4MEMxMy44NDQ0IDgwIDYuODA4NSA3NS43NzQzIDMuMjkwNTcgNjguNjQ3NUMtMC4yMzgxNTUgNjEuNTMxNiAtMC45Mjg3OTIgNTEuNzMzNiAxLjIxODY2IDM5LjI2NDRDMy40MDkyNyAyNi43NDA0IDcuMjI5MzYgMTcuMjkyOCAxMy4yMTg1IDEwLjIzMTZDMTkuMjA3NiAzLjE4MTQzIDI3LjcwMDMgMC4zODk4MTQgMzguMjMyNSAwLjAyODU0NjFDNTMuNDA0OSAtMC40OTY5MzIgNjEuNTQxNSA2LjM5OTk5IDYyLjE0NTggNi45MTQ1MloiIGZpbGw9InVybCgjZykiLz48cGF0aCBkPSJNMjAuOTg5MyAzNFY0NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMjkuOTQxOSAzMFY1MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMzguODk0NSAyNlY1NCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNDcuODQ2NyAzMFY1MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNTYuNzk5MyAzNFY0NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1LjI4OTY3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSItMS4zNjU0NCIgeTE9IjY2LjgwNzkiIHgyPSI4My44Nzk0IiB5Mj0iMjUuMDI3OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMC4xMSIgc3RvcC1jb2xvcj0iIzQzNEZFRiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ExNDNEMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==',
  authors: ['alvys'],
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
  actions: [
    askAlvysAi,
    summarizeText,
    classifyText,
    runAgent,
    classifyDocument,
    routeDocument,
    extractDocument,
  ],
  triggers: [],
});
