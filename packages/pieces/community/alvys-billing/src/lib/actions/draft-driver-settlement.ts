import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysBillingAuth } from '../auth';

/**
 * STUB — pending backend Tier 3 PR which exposes
 * Tracking: https://linear.app/alvys/issue/PLA-134, https://linear.app/alvys/issue/PLA-140
 * POST /api/p/v1.0/DriverSettlements/drafts/items
 * gated by the DriverSettlements tenant feature flag.
 */
export const draftDriverSettlementAction = createAction({
  auth: alvysBillingAuth,
  name: 'draft_driver_settlement',
  displayName: 'Draft Driver Settlement',
  description:
    'Open or append to a driver settlement draft. Used in pay reconciliation workflows triggered when a load is delivered.',
  props: {
    driverId: Property.ShortText({ displayName: 'Driver Id', required: true }),
    payPeriodId: Property.ShortText({ displayName: 'Pay Period Id', required: false }),
    items: Property.Json({
      displayName: 'Items',
      description: 'Array of settlement line items (loads, deductions, accessorials).',
      required: true,
    }),
  },
  async run() {
    throw new Error(
      'Not yet implemented (PLA-134). Awaiting backend Tier 3 PR: POST /api/p/v1.0/DriverSettlements/drafts/items. Track progress at https://linear.app/alvys/issue/PLA-134.',
    );
  },
});
