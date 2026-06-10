import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';

import { alvysAuth } from '../auth';
import {
  alvysRequest,
  buildPath,
  ALVYS_DEFAULT_VERSION,
} from '../common/client';

export function createAlvysWebhookTrigger({
  name,
  displayName,
  description,
  entityType,
  events,
  sampleEventName,
}: {
  name: string;
  displayName: string;
  description: string;
  entityType: string;
  events: Array<{ label: string; value: string }>;
  sampleEventName: string;
}) {
  const storeKey = `alvys_webhook_id_${name}`;
  return createTrigger({
    auth: alvysAuth,
    name,
    displayName,
    description,
    type: TriggerStrategy.WEBHOOK,
    sampleData: {
      Event: sampleEventName,
      EntityType: entityType,
      Timestamp: '2026-01-01T00:00:00Z',
      Data: {},
    },
    props: {
      name: Property.ShortText({
        displayName: 'Subscription Name',
        description: 'Human-readable label stored on the Alvys webhook record.',
        required: true,
      }),
      subsidiaryId: Property.ShortText({
        displayName: 'Subsidiary Id',
        description: 'Alvys subsidiary id that owns the webhook subscription.',
        required: true,
      }),
      events: Property.StaticMultiSelectDropdown({
        displayName: 'Events',
        description: `Select one or more ${entityType} events to subscribe to.`,
        required: true,
        options: { options: events },
      }),
      version: Property.ShortText({
        displayName: 'API Version',
        required: false,
        defaultValue: ALVYS_DEFAULT_VERSION,
      }),
    },
    async onEnable(context) {
      const {
        name: subName,
        subsidiaryId,
        events: selected,
        version,
      } = context.propsValue;
      const response = await alvysRequest<{ Id?: string; id?: string }>({
        auth: context.auth, store: context.store,
        method: HttpMethod.POST,
        path: buildPath({ version, path: '/webhooks' }),
        body: {
          Name: subName,
          SubsidiaryId: subsidiaryId,
          Url: context.webhookUrl,
          Events: selected,
        },
      });
      const id = response?.Id ?? response?.id;
      if (id) {
        await context.store.put<string>(storeKey, id);
      }
    },
    async onDisable(context) {
      const { version } = context.propsValue;
      const id = await context.store.get<string>(storeKey);
      if (!id) return;
      try {
        await alvysRequest({
          auth: context.auth, store: context.store,
          method: HttpMethod.DELETE,
          path: buildPath({
            version,
            path: `/webhooks/${encodeURIComponent(id)}`,
          }),
        });
      } finally {
        await context.store.delete(storeKey);
      }
    },
    async run(context) {
      return [context.payload.body];
    },
  });
}
