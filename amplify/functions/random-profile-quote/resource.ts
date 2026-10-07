import { defineFunction, secret } from '@aws-amplify/backend';

export const randomProfileQuote = defineFunction({
  name: 'random-profile-quote',
  entry: './handler.ts',
  timeoutSeconds: 10,
  resourceGroupName: 'data',
  environment: {
    API_NINJAS_API_KEY: secret('API_NINJAS_API_KEY'),
  },
});
