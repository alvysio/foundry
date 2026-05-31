import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const addLoadNoteAction = createAction({
  auth: alvysAuth,
  name: 'add_load_note',
  displayName: 'Add Load Note',
  description: 'Attach a new note to a load.',
  props: {
    version: versionProp,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
    note: Property.LongText({
      displayName: 'Note',
      required: true,
    }),
    extra: Property.Json({
      displayName: 'Additional Fields',
      description: 'Optional JSON merged into the request body.',
      required: false,
      defaultValue: {},
    }),
  },
  async run(context) {
    const { version, loadNumber, note, extra } = context.propsValue;
    const body: Record<string, unknown> = { Note: note };
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      Object.assign(body, extra);
    }
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.POST,
      path: buildPath({
        version,
        path: `/loads/${encodeURIComponent(loadNumber)}/notes`,
      }),
      body,
    });
  },
});
