import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'recipeImages',
  access: (allow) => ({
    'recipe-images/processed/*': [
      allow.guest.to(['get']),
      allow.authenticated.to(['get', 'list', 'write', 'delete']),
    ],
    'recipe-images/raw/*': [allow.authenticated.to(['write', 'delete'])],
  }),
});
