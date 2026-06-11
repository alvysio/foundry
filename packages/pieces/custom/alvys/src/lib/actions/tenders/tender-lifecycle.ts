import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../../auth';
import { alvysRequest, buildPath } from '../../common/client';
import { versionProp } from '../../common/props';

export const createTenderAction = createAction({
  auth: alvysAuth,
  name: 'create_tender',
  displayName: 'Create Tender',
  description: 'Submit an inbound tender (EDI 204-shaped) to Alvys.',
  props: {
    version: versionProp,
    tender: Property.Json({
      displayName: 'Tender',
      description: 'InboundTenderRequest payload.',
      required: true,
    }),
  },
  async run(context) {
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version: context.propsValue.version, path: '/tenders' }),
      body: context.propsValue.tender,
    });
  },
});

export const updateTenderAction = createAction({
  auth: alvysAuth,
  name: 'update_tender',
  displayName: 'Update Tender',
  description: 'Submit a tender change (EDI 204 update) to Alvys.',
  props: {
    version: versionProp,
    tender: Property.Json({
      displayName: 'Tender',
      description: 'InboundTenderRequest payload with the updated values.',
      required: true,
    }),
  },
  async run(context) {
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version: context.propsValue.version, path: '/tenders/update' }),
      body: context.propsValue.tender,
    });
  },
});

export const cancelTenderAction = createAction({
  auth: alvysAuth,
  name: 'cancel_tender',
  displayName: 'Cancel Tender',
  description: 'Submit a tender cancellation (EDI 204 cancel) to Alvys.',
  props: {
    version: versionProp,
    tender: Property.Json({
      displayName: 'Tender',
      description: 'InboundTenderRequest payload identifying the tender to cancel.',
      required: true,
    }),
  },
  async run(context) {
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version: context.propsValue.version, path: '/tenders/cancel' }),
      body: context.propsValue.tender,
    });
  },
});

export const acceptTenderAction = createAction({
  auth: alvysAuth,
  name: 'accept_tender',
  displayName: 'Accept Tender',
  description: 'Accept a tender and link each stop to a company. Creates the load.',
  props: {
    version: versionProp,
    tenderId: Property.ShortText({ displayName: 'Tender Id', required: true }),
    stopCompanyLinks: Property.Json({
      displayName: 'Stop → Company Links',
      description: 'Array of { StopId, CompanyId }. At least two required (pickup + delivery).',
      required: true,
    }),
    fleetId: Property.ShortText({
      displayName: 'Fleet Id',
      required: false,
    }),
  },
  async run(context) {
    const { version, tenderId, stopCompanyLinks, fleetId } = context.propsValue;
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: `/tenders/${encodeURIComponent(tenderId)}/accept` }),
      body: { StopCompanyLinks: stopCompanyLinks, ...(fleetId ? { FleetId: fleetId } : {}) },
    });
  },
});

export const acceptTenderUpdatesAction = createAction({
  auth: alvysAuth,
  name: 'accept_tender_updates',
  displayName: 'Accept Tender Updates',
  description: 'Accept pending changes on a tender.',
  props: {
    version: versionProp,
    tenderId: Property.ShortText({ displayName: 'Tender Id', required: true }),
    applyAllChangesToLoad: Property.Checkbox({
      displayName: 'Apply All Changes to Load',
      required: true,
      defaultValue: true,
    }),
  },
  async run(context) {
    const { version, tenderId, applyAllChangesToLoad } = context.propsValue;
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: `/tenders/${encodeURIComponent(tenderId)}/accept-updates` }),
      body: { ApplyAllChangesToLoad: applyAllChangesToLoad },
    });
  },
});

export const acceptTenderCancelAction = createAction({
  auth: alvysAuth,
  name: 'accept_tender_cancel',
  displayName: 'Accept Tender Cancellation',
  description: 'Accept a pending cancellation on a tender.',
  props: {
    version: versionProp,
    tenderId: Property.ShortText({ displayName: 'Tender Id', required: true }),
  },
  async run(context) {
    const { version, tenderId } = context.propsValue;
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: `/tenders/${encodeURIComponent(tenderId)}/accept-cancel` }),
    });
  },
});

export const rejectTenderAction = createAction({
  auth: alvysAuth,
  name: 'reject_tender',
  displayName: 'Reject Tender',
  description: 'Reject a tender with a reason code and optionally cancel the linked load.',
  props: {
    version: versionProp,
    tenderId: Property.ShortText({ displayName: 'Tender Id', required: true }),
    reasonCode: Property.ShortText({ displayName: 'Reason Code', required: true }),
    reasonDescription: Property.LongText({ displayName: 'Reason Description', required: true }),
    cancelLinkedLoad: Property.Checkbox({
      displayName: 'Cancel Linked Load',
      required: true,
      defaultValue: false,
    }),
  },
  async run(context) {
    const { version, tenderId, reasonCode, reasonDescription, cancelLinkedLoad } = context.propsValue;
    return alvysRequest({
      auth: context.auth,
      store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: `/tenders/${encodeURIComponent(tenderId)}/reject` }),
      body: {
        ReasonCode: reasonCode,
        ReasonDescription: reasonDescription,
        CancelLinkedLoad: cancelLinkedLoad,
      },
    });
  },
});
