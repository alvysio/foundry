import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysBillingAuth } from '../auth';

/**
 * STUB — pending backend Tier 3 PR which exposes
 * POST /api/p/v1.0/Edi/invoices/{invoiceNumber}/send-210
 * with idempotency guard to prevent double-billing.
 */
export const sendEdi210Action = createAction({
  auth: alvysBillingAuth,
  name: 'send_edi_210',
  displayName: 'Send EDI 210 Invoice',
  description:
    'Transmit the EDI 210 invoice transaction for an invoice. Idempotent — re-sending an already-acknowledged 210 is a no-op.',
  props: {
    invoiceNumber: Property.ShortText({ displayName: 'Invoice Number', required: true }),
  },
  async run() {
    throw new Error(
      'Not yet implemented. Awaiting backend Tier 3 PR: POST /api/p/v1.0/Edi/invoices/{invoiceNumber}/send-210.',
    );
  },
});
