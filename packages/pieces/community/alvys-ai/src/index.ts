import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';

import { alvysAiAuth } from './lib/auth';
import { aiPromptAction } from './lib/actions/ai-prompt';
import { aiClassifyAction } from './lib/actions/ai-classify';

export { alvysAiAuth };

export const alvysAi = createPiece({
  displayName: 'Alvys AI',
  description:
    'Alvys-routed AI primitives. Prompts and classification run through the Alvys token broker — no third-party API keys, tenant isolation, PII redaction, audit logging, and metered billing built in.',
  auth: alvysAiAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAnCAYAAACSamGGAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAODSURBVHgBxZhBdtowEIZHslknnCD0BCUnCCHte9008Q2SnqDJCYAThJyg9AbkvS66SBvnBKEnKOybZ7LsC9Z0xsGtEcYeGbf9FhjskfklzYykUVCRThDt0qWlY2grBTsIppk+U0ZPYoB5+KkZQg0oF2MS1vGMCUDpExYobBYCwqih4e7zuDnNPjgKolN+VtQ4VrAvEpmIQ+jxV9iOUUPBgMW+DqK2Qbile7sF9vMv181mqcjucXRJ03kO9TGl0RvSHPahWCATkshDv8ji6CT6QJczqJcWCRyKLBEf+aI3PecRhPoFOoGIIV9zRb4Kol7NU1wJg3rC17XpfhNErSdM/MUF8jNzDdr/jrF5VJ7eAbPYR6UPlDwLrONDvsgnY/qUYkACkjit4N3NeHM+7AbRORn2VHmQ2MzDcXPOX1bU0DR3SOCp5A0kcGIohxUJZL6Om0OyOyT7ObgxSb+siESE9yCAR5D/OO1pGWQ3oYgegAtovoEtkn2RLoGkvYvAFB5Rl9GkAZuCLfKnMaJopsaD0FrepCheIoWkkc38Fqmf1+Pyxrp4ra0N3/JJXkdBlipGVUeRcUhH86w7JSJjMB1JS6W9MWwB+WRbaDrJ/khEKtQHkpYLjO+gIsvZkpGJbCb1SckLQteIzmIWcUtqm41sRqc77PKWq71zBbUSj2Q2shntC/3E7p0rSumXYmPf8kkDRiTS7p0r0sjm5dZ2K41GmBas3rnALiWNbJWzKmlK4nuCtrBN0Pjy1JPr+xzdki3UFLZA6lKM8hq39j3ZxnFLxC4FSS6e2ff+iUjpvoBJtnV2e5DRWuZTZ7pvf5yBQ2Tn3WeRsoBYODj/Et6j0np/KbVXiLO8+9qgmQnag+fJdu0pXPWgA909OJxtEDB/JOnMNQUZAZ3Fe2VGJK59dPww8spLKOtivMZ93n3fAx0akEFn8T5VNTq0t7uKn5M7u8qux66gYY8ycUDD0ZGeNm3yIjv5X/7onkRRhSNn7VDdJ7c2lXRZK3MF/5lNkc0kIheghxXOxbWyKbKZRGSyLrueiwUUjc66LRaPJMPnYlWTUJ4VetcFlWAupG02RXbyLPuDSiZ9pBdXnfqluAEVD17ccDFgEYuDcVNkM7nRRLmuRbXxvqQqlggDGJO4j3Zd6PD4YUiJWLIIJGVncBFpCW57JBTNn+2W0n5EG7BZ/LyLnsJf5hcaeWD5dhqamgAAAABJRU5ErkJggg==',
  authors: ['alvys'],
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
  actions: [aiPromptAction, aiClassifyAction],
  triggers: [],
});
