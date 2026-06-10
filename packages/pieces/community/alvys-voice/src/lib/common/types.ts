export type AlvysVoiceResidency = 'default' | 'us' | 'eu';

export interface ExtendedReadableStream<R> extends ReadableStream {
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}

export type AlvysVoiceAuthProps = {
  region: AlvysVoiceResidency;
  apiKey: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
};
