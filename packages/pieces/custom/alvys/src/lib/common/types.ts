export type AlvysEnvironment = 'production' | 'qa';

export type AlvysAuthValue = {
  environment: string;
  clientId: string;
  clientSecret: string;
};
