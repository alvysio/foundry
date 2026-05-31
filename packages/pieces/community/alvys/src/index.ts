import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';

import { alvysAuth } from './lib/auth';
export { alvysAuth };
import { ALVYS_API_BASE } from './lib/common/client';

import { searchLoadsAction } from './lib/actions/search-loads';
import { listLoadsAction } from './lib/actions/list-loads';
import { getLoadNotesAction } from './lib/actions/get-load-notes';
import { addLoadNoteAction } from './lib/actions/add-load-note';
import { deleteLoadNoteAction } from './lib/actions/delete-load-note';
import { getLoadDocumentsAction } from './lib/actions/get-load-documents';

import { searchTripsAction } from './lib/actions/search-trips';
import { getTripStopsAction } from './lib/actions/get-trip-stops';
import { recordTripArrivalAction } from './lib/actions/record-trip-arrival';
import { recordTripDepartureAction } from './lib/actions/record-trip-departure';
import { updateTripAppointmentAction } from './lib/actions/update-trip-appointment';
import {
  getTripDocumentsAction,
  deleteTripStopArrivalAction,
} from './lib/actions/trip-documents';

import { searchDriversAction } from './lib/actions/search-drivers';
import { getDriverAction } from './lib/actions/get-driver';
import { searchCarriersAction } from './lib/actions/search-carriers';
import { getCarrierAction } from './lib/actions/get-carrier';

import { searchCustomersAction } from './lib/actions/search-customers';
import { listCustomersAction } from './lib/actions/list-customers';
import { upsertCustomerAction } from './lib/actions/upsert-customer';
import { deleteCustomerAction } from './lib/actions/delete-customer';

import {
  searchTrucksAction,
  searchTrailersAction,
  searchInvoicesAction,
  searchLocationsAction,
  searchTollsAction,
  searchFuelAction,
  searchMaintenanceAction,
  searchDeductionsAction,
  searchUsersAction,
  searchDispatchPreferencesAction,
  searchTruckEventsAction,
  searchTrailerEventsAction,
  searchDriverEventsAction,
} from './lib/actions/search-generic';

import {
  getTruckAction,
  getTrailerAction,
  getTollAction,
  getFuelAction,
  getMaintenanceAction,
  getDeductionAction,
} from './lib/actions/get-by-id';

import {
  listDriversAction,
  listTrucksAction,
  listTrailersAction,
  listInvoicesAction,
  listLocationsAction,
  listTripsAction,
  listUsersAction,
} from './lib/actions/list-resources';

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
    listLoadsAction,
    getLoadNotesAction,
    addLoadNoteAction,
    deleteLoadNoteAction,
    getLoadDocumentsAction,

    searchTripsAction,
    listTripsAction,
    getTripStopsAction,
    getTripDocumentsAction,
    recordTripArrivalAction,
    recordTripDepartureAction,
    deleteTripStopArrivalAction,
    updateTripAppointmentAction,

    searchDriversAction,
    listDriversAction,
    getDriverAction,
    searchDriverEventsAction,

    searchCarriersAction,
    getCarrierAction,

    searchCustomersAction,
    listCustomersAction,
    upsertCustomerAction,
    deleteCustomerAction,

    searchTrucksAction,
    listTrucksAction,
    getTruckAction,
    searchTruckEventsAction,

    searchTrailersAction,
    listTrailersAction,
    getTrailerAction,
    searchTrailerEventsAction,

    searchInvoicesAction,
    listInvoicesAction,
    createCarrierInvoiceAction,
    recordCarrierPaymentsAction,
    recordCustomerPaymentsAction,
    recordInvoiceFinancingAction,

    searchLocationsAction,
    listLocationsAction,

    searchTollsAction,
    getTollAction,

    searchFuelAction,
    getFuelAction,

    searchMaintenanceAction,
    getMaintenanceAction,

    searchDeductionsAction,
    getDeductionAction,
    createOneTimeDeductionAction,
    deleteDeductionAction,

    searchUsersAction,
    listUsersAction,

    searchDispatchPreferencesAction,

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
