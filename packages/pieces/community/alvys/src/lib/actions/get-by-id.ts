import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

function buildGetByIdAction({
  name,
  displayName,
  description,
  resourcePath,
  idLabel,
  supportsDocuments,
  documentsPath,
}: {
  name: string;
  displayName: string;
  description: string;
  resourcePath: string;
  idLabel: string;
  supportsDocuments?: boolean;
  documentsPath?: string;
}) {
  return createAction({
    auth: alvysAuth,
    name,
    displayName,
    description,
    props: {
      version: versionProp,
      id: Property.ShortText({ displayName: idLabel, required: true }),
      ...(supportsDocuments
        ? {
            documents: Property.Checkbox({
              displayName: 'Fetch Documents',
              required: false,
              defaultValue: false,
            }),
          }
        : {}),
    },
    async run(context) {
      const { version, id } = context.propsValue;
      const docs = (context.propsValue as Record<string, unknown>)[
        'documents'
      ] as boolean | undefined;
      const path =
        supportsDocuments && docs && documentsPath
          ? documentsPath.replace('{id}', encodeURIComponent(id))
          : `${resourcePath}/${encodeURIComponent(id)}`;
      return alvysRequest({
        token: context.auth.secret_text,
        method: HttpMethod.GET,
        path: buildPath({ version, path }),
      });
    },
  });
}

export const getTruckAction = buildGetByIdAction({
  name: 'get_truck',
  displayName: 'Get Truck',
  description: 'Fetch a truck by id, optionally its documents.',
  resourcePath: '/trucks',
  idLabel: 'Truck Id',
  supportsDocuments: true,
  documentsPath: '/trucks/{id}/documents',
});

export const getTrailerAction = buildGetByIdAction({
  name: 'get_trailer',
  displayName: 'Get Trailer',
  description: 'Fetch a trailer by id, optionally its documents.',
  resourcePath: '/trailers',
  idLabel: 'Trailer Id',
  supportsDocuments: true,
  documentsPath: '/trailers/{id}/documents',
});

export const getFuelAction = buildGetByIdAction({
  name: 'get_fuel',
  displayName: 'Get Fuel Transaction',
  description: 'Fetch a fuel transaction by id.',
  resourcePath: '/fuel',
  idLabel: 'Fuel Id',
});

export const getMaintenanceAction = buildGetByIdAction({
  name: 'get_maintenance',
  displayName: 'Get Maintenance Record',
  description: 'Fetch a maintenance record by id.',
  resourcePath: '/maintenance',
  idLabel: 'Maintenance Id',
});

export const getDeductionAction = buildGetByIdAction({
  name: 'get_deduction',
  displayName: 'Get Deduction',
  description: 'Fetch a deduction by id.',
  resourcePath: '/deductions',
  idLabel: 'Deduction Id',
});
