import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import FormData from 'form-data';

import { alvysAuth } from '../auth';
import { alvysApiBase, buildPath } from '../common/client';
import { alvysTokenService } from '../common/token-service';
import { versionProp } from '../common/props';

function createEntityDocumentUpload({
  entity,
  routeSegment,
  idLabel,
}: {
  entity: 'Carrier' | 'Driver' | 'Truck' | 'Trailer';
  routeSegment: string;
  idLabel: string;
}) {
  return createAction({
    auth: alvysAuth,
    name: `upload_${entity.toLowerCase()}_document`,
    displayName: `Attach Document to ${entity}`,
    description: `Upload a document to a ${entity.toLowerCase()}.`,
    props: {
      version: versionProp,
      entityId: Property.ShortText({ displayName: idLabel, required: true }),
      file: Property.File({ displayName: 'File', required: true }),
      documentType: Property.ShortText({ displayName: 'Document Type', required: false }),
    },
    async run(context) {
      const { version, entityId, file, documentType } = context.propsValue;

      const formData = new FormData();
      formData.append('file', Buffer.from(file.base64, 'base64'), file.filename);
      if (documentType) {
        formData.append('documentType', documentType);
      }

      const path = buildPath({
        version,
        path: `/${routeSegment}/${encodeURIComponent(entityId)}/document`,
      });

      const raw = context.auth as unknown as {
        props?: { environment?: string; clientId?: string; clientSecret?: string };
        environment?: string;
        clientId?: string;
        clientSecret?: string;
      };
      const src = raw?.props ?? raw;
      const token = await alvysTokenService.resolveAlvysToken({
        auth: {
          environment: src?.environment ?? 'production',
          clientId: src?.clientId ?? '',
          clientSecret: src?.clientSecret ?? '',
        },
        store: context.store,
      });

      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: `${alvysApiBase(context.auth)}${path}`,
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });
      return response.body;
    },
  });
}

export const uploadCarrierDocumentAction = createEntityDocumentUpload({
  entity: 'Carrier',
  routeSegment: 'Carriers',
  idLabel: 'Carrier Id',
});

export const uploadDriverDocumentAction = createEntityDocumentUpload({
  entity: 'Driver',
  routeSegment: 'Drivers',
  idLabel: 'Driver Id',
});

export const uploadTruckDocumentAction = createEntityDocumentUpload({
  entity: 'Truck',
  routeSegment: 'Trucks',
  idLabel: 'Truck Id',
});

export const uploadTrailerDocumentAction = createEntityDocumentUpload({
  entity: 'Trailer',
  routeSegment: 'Trailers',
  idLabel: 'Trailer Id',
});
