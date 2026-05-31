import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

function buildInvoicePost({
  name,
  displayName,
  description,
  path,
}: {
  name: string;
  displayName: string;
  description: string;
  path: string;
}) {
  return createAction({
    auth: alvysAuth,
    name,
    displayName,
    description,
    props: {
      version: versionProp,
      body: Property.Json({
        displayName: 'Request Body',
        description: 'JSON payload matching the Alvys API schema for this endpoint.',
        required: true,
      }),
    },
    async run(context) {
      const { version, body } = context.propsValue;
      return alvysRequest({
        token: context.auth.secret_text,
        method: HttpMethod.POST,
        path: buildPath({ version, path }),
        body,
      });
    },
  });
}

export const createCarrierInvoiceAction = buildInvoicePost({
  name: 'create_carrier_invoice',
  displayName: 'Create Carrier Invoice',
  description: 'POST /invoices/carrier-invoice.',
  path: '/invoices/carrier-invoice',
});

export const recordCarrierPaymentsAction = buildInvoicePost({
  name: 'record_carrier_payments',
  displayName: 'Record Carrier Payments',
  description: 'POST /invoices/carrier-payments.',
  path: '/invoices/carrier-payments',
});

export const recordCustomerPaymentsAction = buildInvoicePost({
  name: 'record_customer_payments',
  displayName: 'Record Customer Payments',
  description: 'POST /invoices/customer-payments.',
  path: '/invoices/customer-payments',
});

export const recordInvoiceFinancingAction = buildInvoicePost({
  name: 'record_invoice_financing',
  displayName: 'Record Invoice Financing',
  description: 'POST /invoices/financing.',
  path: '/invoices/financing',
});
