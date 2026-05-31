import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const updateTripAppointmentAction = createAction({
  auth: alvysAuth,
  name: 'update_trip_appointment',
  displayName: 'Update Trip Stop Appointment',
  description: 'Update the appointment window and confirmation flags on a trip stop.',
  props: {
    version: versionProp,
    tripId: Property.ShortText({ displayName: 'Trip Id', required: true }),
    stopId: Property.ShortText({ displayName: 'Stop Id', required: true }),
    scheduleType: Property.ShortText({
      displayName: 'Schedule Type',
      required: true,
    }),
    loadingType: Property.ShortText({
      displayName: 'Loading Type',
      required: true,
    }),
    appointmentRequested: Property.Checkbox({
      displayName: 'Appointment Requested',
      required: true,
      defaultValue: false,
    }),
    appointmentConfirmed: Property.Checkbox({
      displayName: 'Appointment Confirmed',
      required: true,
      defaultValue: false,
    }),
    appointmentDate: Property.DateTime({
      displayName: 'Appointment Date',
      required: false,
    }),
    windowBegin: Property.DateTime({
      displayName: 'Window Begin',
      required: false,
    }),
    windowEnd: Property.DateTime({
      displayName: 'Window End',
      required: false,
    }),
  },
  async run(context) {
    const {
      version,
      tripId,
      stopId,
      scheduleType,
      loadingType,
      appointmentRequested,
      appointmentConfirmed,
      appointmentDate,
      windowBegin,
      windowEnd,
    } = context.propsValue;
    const body: Record<string, unknown> = {
      ScheduleType: scheduleType,
      LoadingType: loadingType,
      AppointmentRequested: appointmentRequested,
      AppointmentConfirmed: appointmentConfirmed,
    };
    if (appointmentDate) body['AppointmentDate'] = appointmentDate;
    if (windowBegin) body['WindowBegin'] = windowBegin;
    if (windowEnd) body['WindowEnd'] = windowEnd;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.PUT,
      path: buildPath({
        version,
        path: `/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/appointment`,
      }),
      body,
    });
  },
});
