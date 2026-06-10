import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath, cleanPayload } from '../common/client';
import { versionProp } from '../common/props';

export const createMaintenanceOrderAction = createAction({
  auth: alvysAuth,
  name: 'create_maintenance_order',
  displayName: 'Create Maintenance Order',
  description:
    'Open a preventive maintenance (PM) order against a truck or trailer. Used in maintenance scheduling workflows triggered by mileage or DTC thresholds.',
  props: {
    version: versionProp,
    assetId: Property.ShortText({
      displayName: 'Asset Id',
      description: 'Truck or trailer id the maintenance order applies to.',
      required: true,
    }),
    type: Property.ShortText({
      displayName: 'Type',
      description: 'Maintenance type (e.g. "PM-A", "DOT Inspection", "Tire Replacement").',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      required: false,
    }),
    dueDate: Property.DateTime({
      displayName: 'Due Date',
      required: false,
    }),
    reminders: Property.Array({
      displayName: 'Reminders',
      description: 'Optional reminder objects (shape matches Alvys reminder model).',
      required: false,
    }),
    extra: Property.Json({
      displayName: 'Additional Fields',
      required: false,
      defaultValue: {},
    }),
  },
  async run(context) {
    const { version, assetId, type, description, dueDate, reminders, extra } =
      context.propsValue;
    const body = cleanPayload({
      AssetId: assetId,
      Type: type,
      Description: description,
      DueDate: dueDate,
      Reminders: reminders && reminders.length > 0 ? reminders : undefined,
    });
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      Object.assign(body, extra);
    }
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/Maintenance' }),
      body,
    });
  },
});
