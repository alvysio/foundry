import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';

import { alvysAuth } from './lib/auth';
export { alvysAuth };
import { alvysApiBase } from './lib/common/client';
import { alvysTokenService } from './lib/common/token-service';
import type { AlvysAuthValue } from './lib/common/types';

import { searchLoadsAction } from './lib/actions/search-loads';
import { getLoadNotesAction } from './lib/actions/get-load-notes';
import { addLoadNoteAction } from './lib/actions/add-load-note';
import { getLoadDocumentsAction } from './lib/actions/get-load-documents';
import { getLoadByNumberAction } from './lib/actions/get-load-by-number';
import { getLoadRateConfirmationAction } from './lib/actions/get-load-ratecon';
import { uploadLoadDocumentAction } from './lib/actions/upload-load-document';
import { createMaintenanceOrderAction } from './lib/actions/create-maintenance-order';

import { searchTripsAction } from './lib/actions/search-trips';
import { getTripStopsAction } from './lib/actions/get-trip-stops';
import { recordTripArrivalAction } from './lib/actions/record-trip-arrival';
import { recordTripDepartureAction } from './lib/actions/record-trip-departure';
import { updateTripAppointmentAction } from './lib/actions/update-trip-appointment';
import { getTripDocumentsAction } from './lib/actions/trip-documents';

import { searchDriversAction } from './lib/actions/search-drivers';
import { getDriverAction } from './lib/actions/get-driver';
import { searchCarriersAction } from './lib/actions/search-carriers';
import { getCarrierAction } from './lib/actions/get-carrier';

import { searchCustomersAction } from './lib/actions/search-customers';
import { upsertCustomerAction } from './lib/actions/upsert-customer';
import { getCustomerAction } from './lib/actions/get-customer';

import {
  searchTrucksAction,
  searchInvoicesAction,
  searchFuelAction,
  searchMaintenanceAction,
  searchDeductionsAction,
} from './lib/actions/search-generic';

import {
  getTruckAction,
  getTrailerAction,
  getFuelAction,
  getMaintenanceAction,
  getDeductionAction,
} from './lib/actions/get-by-id';

import {
  getInboundVisibilityHistoryAction,
  getOutboundVisibilityHistoryAction,
  searchOutboundVisibilityErrorsAction,
} from './lib/actions/visibility';

import {
  createOneTimeDeductionAction,
  deleteDeductionAction,
} from './lib/actions/deductions';

import {
  createCarrierInvoiceAction,
  recordCarrierPaymentsAction,
  recordCustomerPaymentsAction,
  recordInvoiceFinancingAction,
} from './lib/actions/invoice-posts';

import {
  tenderEventTrigger,
  loadEventTrigger,
  tripEventTrigger,
  driverEventTrigger,
  carrierEventTrigger,
  truckEventTrigger,
  trailerEventTrigger,
} from './lib/triggers';

import { assignCarrierToLoadAction } from './lib/actions/dispatch/assign-carrier-to-load';
import { postLoadStatusAction } from './lib/actions/dispatch/post-load-status';

import { draftCustomerInvoiceAction } from './lib/actions/billing/draft-customer-invoice';
import { draftDriverSettlementAction } from './lib/actions/billing/draft-driver-settlement';
import { sendEdi210Action } from './lib/actions/billing/send-edi-210';

export const alvys = createPiece({
  displayName: 'Alvys',
  description:
    'Alvys TMS — manage loads, trips, drivers, carriers, customers, invoices and webhook subscriptions through the Alvys Public API.',
  auth: alvysAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAnCAYAAACSamGGAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAODSURBVHgBxZhBdtowEIZHslknnCD0BCUnCCHte9008Q2SnqDJCYAThJyg9AbkvS66SBvnBKEnKOybZ7LsC9Z0xsGtEcYeGbf9FhjskfklzYykUVCRThDt0qWlY2grBTsIppk+U0ZPYoB5+KkZQg0oF2MS1vGMCUDpExYobBYCwqih4e7zuDnNPjgKolN+VtQ4VrAvEpmIQ+jxV9iOUUPBgMW+DqK2Qbile7sF9vMv181mqcjucXRJ03kO9TGl0RvSHPahWCATkshDv8ji6CT6QJczqJcWCRyKLBEf+aI3PecRhPoFOoGIIV9zRb4Kol7NU1wJg3rC17XpfhNErSdM/MUF8jNzDdr/jrF5VJ7eAbPYR6UPlDwLrONDvsgnY/qUYkACkjit4N3NeHM+7AbRORn2VHmQ2MzDcXPOX1bU0DR3SOCp5A0kcGIohxUJZL6Om0OyOyT7ObgxSb+siESE9yCAR5D/OO1pGWQ3oYgegAtovoEtkn2RLoGkvYvAFB5Rl9GkAZuCLfKnMaJopsaD0FrepCheIoWkkc38Fqmf1+Pyxrp4ra0N3/JJXkdBlipGVUeRcUhH86w7JSJjMB1JS6W9MWwB+WRbaDrJ/khEKtQHkpYLjO+gIsvZkpGJbCb1SckLQteIzmIWcUtqm41sRqc77PKWq71zBbUSj2Q2shntC/3E7p0rSumXYmPf8kkDRiTS7p0r0sjm5dZ2K41GmBas3rnALiWNbJWzKmlK4nuCtrBN0Pjy1JPr+xzdki3UFLZA6lKM8hq39j3ZxnFLxC4FSS6e2ff+iUjpvoBJtnV2e5DRWuZTZ7pvf5yBQ2Tn3WeRsoBYODj/Et6j0np/KbVXiLO8+9qgmQnag+fJdu0pXPWgA909OJxtEDB/JOnMNQUZAZ3Fe2VGJK59dPww8spLKOtivMZ93n3fAx0akEFn8T5VNTq0t7uKn5M7u8qux66gYY8ycUDD0ZGeNm3yIjv5X/7onkRRhSNn7VDdJ7c2lXRZK3MF/5lNkc0kIheghxXOxbWyKbKZRGSyLrueiwUUjc66LRaPJMPnYlWTUJ4VetcFlWAupG02RXbyLPuDSiZ9pBdXnfqluAEVD17ccDFgEYuDcVNkM7nRRLmuRbXxvqQqlggDGJO4j3Zd6PD4YUiJWLIIJGVncBFpCW57JBTNn+2W0n5EG7BZ/LyLnsJf5hcaeWD5dhqamgAAAABJRU5ErkJggg==',
  authors: ['alvys'],
  categories: [
    PieceCategory.BUSINESS_INTELLIGENCE,
    PieceCategory.ACCOUNTING,
  ],
  actions: [
    assignCarrierToLoadAction,
    postLoadStatusAction,

    draftCustomerInvoiceAction,
    draftDriverSettlementAction,
    sendEdi210Action,

    searchLoadsAction,
    getLoadByNumberAction,
    getLoadRateConfirmationAction,
    getLoadNotesAction,
    addLoadNoteAction,
    getLoadDocumentsAction,
    uploadLoadDocumentAction,

    searchTripsAction,
    getTripStopsAction,
    getTripDocumentsAction,
    recordTripArrivalAction,
    recordTripDepartureAction,
    updateTripAppointmentAction,

    searchDriversAction,
    getDriverAction,

    searchCarriersAction,
    getCarrierAction,

    searchCustomersAction,
    getCustomerAction,
    upsertCustomerAction,

    searchTrucksAction,
    getTruckAction,

    getTrailerAction,

    searchInvoicesAction,
    createCarrierInvoiceAction,
    recordCarrierPaymentsAction,
    recordCustomerPaymentsAction,
    recordInvoiceFinancingAction,

    searchFuelAction,
    getFuelAction,

    searchMaintenanceAction,
    getMaintenanceAction,
    createMaintenanceOrderAction,

    searchDeductionsAction,
    getDeductionAction,
    createOneTimeDeductionAction,
    deleteDeductionAction,

    getInboundVisibilityHistoryAction,
    getOutboundVisibilityHistoryAction,
    searchOutboundVisibilityErrorsAction,

    createCustomApiCallAction({
      baseUrl: (auth) => alvysApiBase(auth),
      auth: alvysAuth,
      authMapping: async (auth) => {
        const raw = auth as unknown as { props?: { environment?: string; clientId?: string; clientSecret?: string }; environment?: string; clientId?: string; clientSecret?: string };
        const src = raw?.props ?? raw;
        const token = await alvysTokenService.resolveAlvysToken({
          auth: {
            environment: src?.environment ?? 'production',
            clientId: src?.clientId ?? '',
            clientSecret: src?.clientSecret ?? '',
          },
        });
        return { Authorization: `Bearer ${token}` };
      },
    }),
  ],
  triggers: [
    tenderEventTrigger,
    loadEventTrigger,
    tripEventTrigger,
    driverEventTrigger,
    carrierEventTrigger,
    truckEventTrigger,
    trailerEventTrigger,
  ],
});
