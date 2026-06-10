import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath, cleanPayload } from '../common/client';
import { versionProp } from '../common/props';

export const upsertCustomerAction = createAction({
  auth: alvysAuth,
  name: 'upsert_customer',
  displayName: 'Create or Update Customer',
  description:
    'Create a customer when Customer Id is empty, or PATCH an existing customer when an id is provided.',
  props: {
    version: versionProp,
    customerId: Property.ShortText({
      displayName: 'Customer Id',
      description: 'Leave blank to create a new customer. Provide to update.',
      required: false,
    }),
    name: Property.ShortText({ displayName: 'Name', required: false }),
    type: Property.ShortText({ displayName: 'Type', required: false }),
    companyNumber: Property.ShortText({
      displayName: 'Company Number',
      required: false,
    }),
    status: Property.ShortText({ displayName: 'Status', required: false }),
    externalId: Property.ShortText({
      displayName: 'External Id',
      required: false,
    }),
    email: Property.Array({ displayName: 'Email', required: false }),
    phone: Property.Array({ displayName: 'Phone', required: false }),
    fax: Property.ShortText({ displayName: 'Fax', required: false }),
    billingAddress: Property.Json({
      displayName: 'Billing Address',
      description: 'JSON object matching CustomerWriteAddressRequest.',
      required: false,
    }),
    extra: Property.Json({
      displayName: 'Additional Fields',
      required: false,
      defaultValue: {},
    }),
  },
  async run(context) {
    const {
      version,
      customerId,
      name,
      type,
      companyNumber,
      status,
      externalId,
      email,
      phone,
      fax,
      billingAddress,
      extra,
    } = context.propsValue;
    const body = cleanPayload({
      Name: name,
      Type: type,
      CompanyNumber: companyNumber,
      Status: status,
      ExternalId: externalId,
      Email: email && email.length > 0 ? email : undefined,
      Phone: phone && phone.length > 0 ? phone : undefined,
      Fax: fax,
      BillingAddress: billingAddress ?? undefined,
    });
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      Object.assign(body, extra);
    }
    if (customerId) {
      return alvysRequest({
        auth: context.auth, store: context.store,
        method: HttpMethod.PATCH,
        path: buildPath({
          version,
          path: `/customers/${encodeURIComponent(customerId)}`,
        }),
        body,
      });
    }
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.POST,
      path: buildPath({ version, path: '/customers' }),
      body,
    });
  },
});
