import { defineFunction } from '@aws-amplify/backend';

export const askSousChef = defineFunction({
  name: 'askSousChef',
  entry: './handler.ts',
  environment: {
    // Add any environment variables if needed
  },
  runtime: 20, // Node.js 20
  timeoutSeconds: 30, // Increase timeout for AI calls
});
