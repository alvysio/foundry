import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysDocumentsAuth } from '../auth';

/**
 * STUB — Alvys Document Intelligence (bem.ai-backed).
 *
 * Backend route (pending): POST /api/p/v1.0/Documents/extract
 *
 * The Alvys backend:
 *   1. Resolves the document type → canonical schema (POD, ratecon, BOL, COI, MVR, IFTA).
 *   2. Auto-injects the schema PLUS the per-tenant custom references configured
 *      for the associated entity (load, trip, driver, truck, trailer, carrier).
 *   3. Calls bem.ai's extract pipeline with the merged schema.
 *   4. Returns normalized structured output keyed by the canonical field names.
 *   5. Writes the extracted record to Cosmos and emits a document.extracted event.
 *
 * Customers never see bem credentials or schema mechanics — they pick the doc
 * type and the entity it attaches to.
 */
export const extractDocumentAction = createAction({
  auth: alvysDocumentsAuth,
  name: 'extract_document',
  displayName: 'Extract Document',
  description:
    'Extract structured data from a transportation document. Alvys auto-injects the schema for the chosen document type plus any tenant-specific custom references for the linked entity.',
  props: {
    documentType: Property.StaticDropdown({
      displayName: 'Document Type',
      required: true,
      options: {
        options: [
          { label: 'POD (Proof of Delivery)', value: 'pod' },
          { label: 'Rate Confirmation', value: 'ratecon' },
          { label: 'BOL (Bill of Lading)', value: 'bol' },
          { label: 'Customer Invoice', value: 'customer_invoice' },
          { label: 'Carrier Invoice', value: 'carrier_invoice' },
          { label: 'Certificate of Insurance (COI)', value: 'coi' },
          { label: 'Motor Vehicle Record (MVR)', value: 'mvr' },
          { label: 'DAC Report', value: 'dac' },
          { label: 'IFTA Report', value: 'ifta' },
          { label: 'Lumper Receipt', value: 'lumper_receipt' },
          { label: 'Scale Ticket', value: 'scale_ticket' },
          { label: 'Accessorial Receipt', value: 'accessorial_receipt' },
          { label: 'EDI 204 Tender (image)', value: 'edi_204_image' },
          { label: 'Other (uses generic schema)', value: 'other' },
        ],
      },
    }),
    entityType: Property.StaticDropdown({
      displayName: 'Linked Entity Type',
      description:
        'Alvys hydrates the entity record and merges its custom-reference schema into the extraction.',
      required: true,
      options: {
        options: [
          { label: 'Load', value: 'load' },
          { label: 'Trip', value: 'trip' },
          { label: 'Driver', value: 'driver' },
          { label: 'Truck', value: 'truck' },
          { label: 'Trailer', value: 'trailer' },
          { label: 'Carrier', value: 'carrier' },
          { label: 'Customer', value: 'customer' },
          { label: 'Maintenance Order', value: 'maintenance_order' },
          { label: 'Invoice', value: 'invoice' },
          { label: 'None / Standalone', value: 'none' },
        ],
      },
    }),
    entityId: Property.ShortText({
      displayName: 'Linked Entity Id',
      description:
        'Business id for the linked entity (e.g. load number, driver id). Leave blank when Linked Entity Type = None.',
      required: false,
    }),
    file: Property.File({
      displayName: 'Document',
      description: 'PDF, PNG, JPG, or TIFF. Max 25 MB.',
      required: true,
    }),
    extraSchema: Property.Json({
      displayName: 'Extra Fields (Optional)',
      description:
        'JSON Schema fragment to append to the canonical schema. Use sparingly — most fields should be modeled as tenant custom references in Alvys instead.',
      required: false,
    }),
    attachToEntity: Property.Checkbox({
      displayName: 'Attach Document to Entity',
      description:
        'When checked, Alvys also stores the uploaded document on the linked entity (e.g. POD onto the load).',
      required: false,
      defaultValue: true,
    }),
  },
  async run() {
    throw new Error(
      'Not yet implemented. Awaiting Alvys Document Intelligence rollout: POST /api/p/v1.0/Documents/extract.',
    );
  },
});
