import { Property } from '@activepieces/pieces-framework';

import { ALVYS_DEFAULT_VERSION } from './client';

export const versionProp = Property.ShortText({
  displayName: 'API Version',
  description: 'Alvys API version segment (e.g. "1.0", "2.0").',
  required: false,
  defaultValue: ALVYS_DEFAULT_VERSION,
});

export const versionPropV2 = Property.ShortText({
  displayName: 'API Version',
  description: 'Alvys API version segment.',
  required: false,
  defaultValue: '2.0',
});

export const paginationProps = {
  page: Property.Number({
    displayName: 'Page',
    description: 'Zero-based page index.',
    required: false,
    defaultValue: 0,
  }),
  pageSize: Property.Number({
    displayName: 'Page Size',
    required: false,
    defaultValue: 50,
  }),
  includeDeleted: Property.Checkbox({
    displayName: 'Include Deleted',
    required: false,
    defaultValue: false,
  }),
};

export const searchBodyProp = Property.Json({
  displayName: 'Additional Filters',
  description:
    'Optional JSON object with additional search filters merged into the request body. See the Alvys API reference for the exact shape per resource.',
  required: false,
  defaultValue: {},
});

export function mergeSearchBody({
  base,
  extra,
}: {
  base: Record<string, unknown>;
  extra: unknown;
}): Record<string, unknown> {
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    return { ...base, ...(extra as Record<string, unknown>) };
  }
  return base;
}
