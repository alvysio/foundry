import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysDispatchAuth } from '../auth';

/**
 * STUB — pending backend Tier 2 PR which exposes
 * POST /api/p/v2.0/Loads/{loadNumber}/assign-carrier
 * with DualPermission(EditLoads, Permissions.Load.Update).
 *
 * Server forces Source='public_api' and validates carrier/asset tenant ownership.
 */
export const assignCarrierToLoadAction = createAction({
  auth: alvysDispatchAuth,
  name: 'assign_carrier_to_load',
  displayName: 'Assign Carrier to Load',
  description:
    'Bind a carrier (with optional driver, truck, trailer, rate) to a load. Used to close carrier-sourcing workflows.',
  props: {
    loadNumber: Property.ShortText({ displayName: 'Load Number', required: true }),
    carrierId: Property.ShortText({ displayName: 'Carrier Id', required: true }),
    driverId: Property.ShortText({ displayName: 'Driver Id', required: false }),
    truckId: Property.ShortText({ displayName: 'Truck Id', required: false }),
    trailerId: Property.ShortText({ displayName: 'Trailer Id', required: false }),
    rate: Property.Number({ displayName: 'Carrier Rate (USD)', required: false }),
  },
  async run() {
    throw new Error(
      'Not yet implemented. Awaiting backend Tier 2 PR: POST /api/p/v2.0/Loads/{loadNumber}/assign-carrier.',
    );
  },
});
