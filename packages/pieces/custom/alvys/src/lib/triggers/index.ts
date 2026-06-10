import { createAlvysWebhookTrigger } from './factory';

export const tenderEventTrigger = createAlvysWebhookTrigger({
  name: 'tender_event',
  displayName: 'Tender Event',
  description: 'Fires on Alvys tender lifecycle events (accepted, cancelled, stop arrival/departure, invoiced, bid submitted, etc.).',
  entityType: 'Tender',
  sampleEventName: 'tender.accepted',
  events: [
    { label: 'Tender Accepted', value: 'tender.accepted' },
    { label: 'Tender Cancelled', value: 'tender.cancelled' },
    { label: 'Tender Change Accepted', value: 'tender.change.accepted' },
    { label: 'Tender Rejected', value: 'tender.rejected' },
    { label: 'Tender Invoiced', value: 'tender.invoiced' },
    { label: 'Tender Stop Arrived', value: 'tender.stop.arrived' },
    { label: 'Tender Stop Departed', value: 'tender.stop.departed' },
    { label: 'Tender Stop ETA Updated', value: 'tender.stop.eta_updated' },
    { label: 'Tender Bid Submitted', value: 'tender.bid.submitted' },
  ],
});

export const loadEventTrigger = createAlvysWebhookTrigger({
  name: 'load_event',
  displayName: 'Load Event',
  description: 'Fires on Alvys load status changes, document uploads/deletes, and any field change.',
  entityType: 'Load',
  sampleEventName: 'load.status.changed',
  events: [
    { label: 'Load Status Changed', value: 'load.status.changed' },
    { label: 'Load Changed', value: 'load.changed' },
    { label: 'Load Document Uploaded', value: 'load.document.uploaded' },
    { label: 'Load Document Deleted', value: 'load.document.deleted' },
  ],
});

export const tripEventTrigger = createAlvysWebhookTrigger({
  name: 'trip_event',
  displayName: 'Trip Event',
  description: 'Fires on Alvys trip status changes, document uploads/deletes, and any field change.',
  entityType: 'Trip',
  sampleEventName: 'trip.status.changed',
  events: [
    { label: 'Trip Status Changed', value: 'trip.status.changed' },
    { label: 'Trip Changed', value: 'trip.changed' },
    { label: 'Trip Document Uploaded', value: 'trip.document.uploaded' },
    { label: 'Trip Document Deleted', value: 'trip.document.deleted' },
  ],
});

export const driverEventTrigger = createAlvysWebhookTrigger({
  name: 'driver_event',
  displayName: 'Driver Event',
  description: 'Fires when a driver document is uploaded or deleted.',
  entityType: 'Driver',
  sampleEventName: 'driver.document.uploaded',
  events: [
    { label: 'Driver Document Uploaded', value: 'driver.document.uploaded' },
    { label: 'Driver Document Deleted', value: 'driver.document.deleted' },
  ],
});

export const carrierEventTrigger = createAlvysWebhookTrigger({
  name: 'carrier_event',
  displayName: 'Carrier Event',
  description: 'Fires when a carrier document is uploaded or deleted.',
  entityType: 'Carrier',
  sampleEventName: 'carrier.document.uploaded',
  events: [
    { label: 'Carrier Document Uploaded', value: 'carrier.document.uploaded' },
    { label: 'Carrier Document Deleted', value: 'carrier.document.deleted' },
  ],
});

export const truckEventTrigger = createAlvysWebhookTrigger({
  name: 'truck_event',
  displayName: 'Truck Event',
  description: 'Fires when a truck document is uploaded or deleted.',
  entityType: 'Truck',
  sampleEventName: 'truck.document.uploaded',
  events: [
    { label: 'Truck Document Uploaded', value: 'truck.document.uploaded' },
    { label: 'Truck Document Deleted', value: 'truck.document.deleted' },
  ],
});

export const trailerEventTrigger = createAlvysWebhookTrigger({
  name: 'trailer_event',
  displayName: 'Trailer Event',
  description: 'Fires when a trailer document is uploaded or deleted.',
  entityType: 'Trailer',
  sampleEventName: 'trailer.document.uploaded',
  events: [
    { label: 'Trailer Document Uploaded', value: 'trailer.document.uploaded' },
    { label: 'Trailer Document Deleted', value: 'trailer.document.deleted' },
  ],
});
