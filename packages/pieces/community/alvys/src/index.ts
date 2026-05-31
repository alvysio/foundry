import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';

import { alvysAuth } from './lib/auth';
export { alvysAuth };
import { ALVYS_API_BASE } from './lib/common/client';

import { searchLoadsAction } from './lib/actions/search-loads';
import { getLoadNotesAction } from './lib/actions/get-load-notes';
import { addLoadNoteAction } from './lib/actions/add-load-note';
import { getLoadDocumentsAction } from './lib/actions/get-load-documents';
import { getLoadByNumberAction } from './lib/actions/get-load-by-number';
import { uploadLoadDocumentAction } from './lib/actions/upload-load-document';

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

export const alvys = createPiece({
  displayName: 'Alvys',
  description:
    'Alvys TMS — manage loads, trips, drivers, carriers, customers, invoices and webhook subscriptions through the Alvys Public API.',
  auth: alvysAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/alvys.png',
  authors: ['alvys'],
  categories: [PieceCategory.BUSINESS_INTELLIGENCE],
  actions: [
    searchLoadsAction,
    getLoadByNumberAction,
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

    searchDeductionsAction,
    getDeductionAction,
    createOneTimeDeductionAction,
    deleteDeductionAction,

    getInboundVisibilityHistoryAction,
    getOutboundVisibilityHistoryAction,
    searchOutboundVisibilityErrorsAction,

    createCustomApiCallAction({
      baseUrl: () => ALVYS_API_BASE,
      auth: alvysAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${(auth as { secret_text: string }).secret_text}`,
      }),
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
