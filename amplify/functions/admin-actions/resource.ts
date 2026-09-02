import { defineFunction } from '@aws-amplify/backend';

export const adminActions = defineFunction({
  name: 'admin-actions',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
