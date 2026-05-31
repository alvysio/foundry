import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import { alvysRequest, buildPath } from '../common/client';
import { versionProp } from '../common/props';

export const deleteLoadNoteAction = createAction({
  auth: alvysAuth,
  name: 'delete_load_note',
  displayName: 'Delete Load Note',
  description: 'Remove a note from a load.',
  props: {
    version: versionProp,
    loadNumber: Property.ShortText({
      displayName: 'Load Number',
      required: true,
    }),
    noteId: Property.ShortText({
      displayName: 'Note Id',
      required: true,
    }),
  },
  async run(context) {
    const { version, loadNumber, noteId } = context.propsValue;
    return alvysRequest({
      token: context.auth.secret_text,
      method: HttpMethod.DELETE,
      path: buildPath({
        version,
        path: `/loads/${encodeURIComponent(loadNumber)}/notes/${encodeURIComponent(noteId)}`,
      }),
    });
  },
});
