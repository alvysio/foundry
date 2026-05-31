import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysBillingAuth } from '../auth';

/**
 * STUB — pending backend Tier 2 PR which exposes
 * POST /api/p/v2.0/Loads/{loadNumber}/invoice/draft
 * with DualPermission(EditInvoices, Permissions.Invoice.Create).
 *
 * Server hardcodes SubmitInvoices=false — drafting only, never submission.
 */
export const draftCustomerInvoiceAction = createAction({
  auth: alvysBillingAuth,
  name: 'draft_customer_invoice',
  displayName: 'Draft Customer Invoice',
  description:
    'Generate a draft customer invoice for a load after POD match. Submission is a separate manual step inside Alvys.',
  props: {
    loadNumber: Property.ShortText({ displayName: 'Load Number', required: true }),
    overrideAmount: Property.Number({ displayName: 'Override Amount (USD)', required: false }),
    notes: Property.LongText({ displayName: 'Invoice Notes', required: false }),
  },
  async run() {
    throw new Error(
      'Not yet implemented. Awaiting backend Tier 2 PR: POST /api/p/v2.0/Loads/{loadNumber}/invoice/draft.',
    );
  },
});
