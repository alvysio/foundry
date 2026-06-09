import { Property, createAction } from '@activepieces/pieces-framework';

import { alvysVoiceAuth } from '../auth';
import { createVoiceClient } from '../common/client';
import { ExtendedReadableStream } from '../common/types';

export const textToSpeech = createAction({
  auth: alvysVoiceAuth,
  name: 'alvys_voice_text_to_speech',
  displayName: 'Text to Speech',
  description: 'Convert text to spoken audio using Alvys Voice.',
  props: {
    model: Property.Dropdown({
      auth: alvysVoiceAuth,
      displayName: 'Model',
      required: false,
      refreshers: [],
      refreshOnSearch: false,
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Connect Alvys Voice first.',
            options: [],
          };
        }
        try {
          const client = createVoiceClient(auth);
          const models = await client.models.list();
          return {
            disabled: false,
            placeholder: 'Default model',
            options: models.map((m) => ({
              label: `${m.name} (${m.modelId})`,
              value: m.modelId,
            })),
          };
        } catch {
          return {
            disabled: true,
            options: [],
            placeholder: "Couldn't load models — check your API key.",
          };
        }
      },
    }),
    voice: Property.Dropdown({
      auth: alvysVoiceAuth,
      displayName: 'Voice',
      description: 'Voice profile used to render the audio.',
      required: true,
      refreshers: [],
      refreshOnSearch: false,
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Connect Alvys Voice first.',
            options: [],
          };
        }
        try {
          const client = createVoiceClient(auth);
          const response = await client.voices.getAll();
          return {
            disabled: false,
            options: response.voices.map((v) => ({
              label: v.name ?? v.voiceId,
              value: v.voiceId,
            })),
          };
        } catch {
          return {
            disabled: true,
            options: [],
            placeholder: "Couldn't load voices — check your API key.",
          };
        }
      },
    }),
    text: Property.LongText({
      displayName: 'Text',
      description: 'Text to render as speech.',
      required: true,
    }),
  },
  async run({ auth, propsValue, files }) {
    const client = createVoiceClient(auth);

    const audioStream = (await client.textToSpeech.stream(propsValue.voice, {
      modelId: propsValue.model || undefined,
      text: propsValue.text,
    })) as ExtendedReadableStream<Buffer>;

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    return files.write({
      fileName: 'audio.mp3',
      data: Buffer.concat(chunks),
    });
  },
});
