import { createAction, Property } from '@activepieces/pieces-framework';

import { alvysDocumentsAuth } from '../auth';

/**
 * STUB — Alvys Document Intelligence pipeline factory.
 *
 * Backend route (pending): POST /api/p/v1.0/Documents/pipelines
 *
 * A pipeline represents a recurring extraction contract: e.g. "every
 * carrier-invoice attached to a load goes through this schema, then
 * auto-creates a deduction if the surcharge field is populated".
 *
 * Pipelines are persistent. Once created, the returned pipelineId can be
 * referenced from event triggers (load.document.uploaded, etc.) and from
 * other workflows.
 */
export const buildExtractPipelineAction = createAction({
  auth: alvysDocumentsAuth,
  name: 'build_extract_pipeline',
  displayName: 'Build Document Extract Pipeline',
  description:
    'Define a reusable extract pipeline. Pairs a document type with a target entity and post-extract actions (write back, route, escalate). Returns a pipelineId you can reference from triggers.',
  props: {
    name: Property.ShortText({ displayName: 'Pipeline Name', required: true }),
    documentType: Property.ShortText({
      displayName: 'Document Type',
      description: 'One of the canonical Alvys document type codes (pod, ratecon, bol, coi, ...).',
      required: true,
    }),
    entityType: Property.StaticDropdown({
      displayName: 'Linked Entity Type',
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
        ],
      },
    }),
    postExtract: Property.StaticMultiSelectDropdown({
      displayName: 'Post-Extract Actions',
      description: 'What Alvys does after extraction completes.',
      required: false,
      options: {
        options: [
          { label: 'Write extracted values back to the entity', value: 'write_back' },
          { label: 'Attach raw document to the entity', value: 'attach_document' },
          { label: 'Emit a webhook event', value: 'emit_event' },
          { label: 'Open exception ticket on low confidence', value: 'open_exception' },
          { label: 'Auto-approve when confidence ≥ 0.95', value: 'auto_approve' },
        ],
      },
    }),
    extraSchema: Property.Json({
      displayName: 'Extra Schema',
      description: 'Optional JSON Schema fragment appended to the canonical schema for this pipeline.',
      required: false,
    }),
  },
  async run() {
    throw new Error(
      'Not yet implemented. Awaiting Alvys Document Intelligence rollout: POST /api/p/v1.0/Documents/pipelines.',
    );
  },
});
