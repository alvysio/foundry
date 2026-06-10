import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const addLoadNoteAction = createAction({
  auth: alvysAuth,
  name: 'add_load_note',
  displayName: 'Add Note to Load',
  description: 'Attach a new note to a load.',
  props: {
    version: versionProp,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Body of the note.',
      required: true,
    }),
    noteType: Property.ShortText({
      displayName: 'Note Type',
      description: 'Note category (e.g. "Operations", "Billing"). Required by the Alvys public API.',
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
    const { version, loadNumber, description, noteType, extra } = context.propsValue;
    const body: Record<string, unknown> = {
      Id: 0,
      Description: description,
      NoteType: noteType,
    };
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      Object.assign(body, extra);
    }
    return alvysRequest({
      auth: context.auth, store: context.store,
      method: HttpMethod.POST,
      path: buildPath({
        version,
        path: `/loads/${encodeURIComponent(loadNumber)}/notes`,
      }),
      body,
    });
  },
});
