import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysAuth } from '../../auth';

/**
 * STUB — pending backend Tier 2 PR which exposes
 * Tracking: https://linear.app/alvys/issue/PLA-132
 * POST /api/p/v2.0/Loads/{loadNumber}/status
 * with DualPermission(EditLoads, Permissions.Load.Update).
 *
 * Allowed transition set validated server-side.
 */
export const postLoadStatusAction = createAction({
  auth: alvysAuth,
  name: 'post_load_status',
  displayName: 'Post Load Status Update',
  description:
    'Log a status transition on a load (e.g. in-transit, at-pickup, delayed). Used by check-call automation to keep customers and dispatchers in sync.',
  props: {
    loadNumber: Property.ShortText({ displayName: 'Load Number', required: true }),
    status: Property.StaticDropdown({
      displayName: 'Status',
      required: true,
      options: {
        options: [
          { label: 'Dispatched', value: 'dispatched' },
          { label: 'At Pickup', value: 'at_pickup' },
          { label: 'Loaded / In Transit', value: 'in_transit' },
          { label: 'At Delivery', value: 'at_delivery' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Delayed', value: 'delayed' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
    }),
    notes: Property.LongText({ displayName: 'Notes', required: false }),
  },
  async run() {
    throw new Error(
      'Not yet implemented (PLA-132). Awaiting backend Tier 2 PR: POST /api/p/v2.0/Loads/{loadNumber}/status. Track progress at https://linear.app/alvys/issue/PLA-132.',
    );
  },
});
