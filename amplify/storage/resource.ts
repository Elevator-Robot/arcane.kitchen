import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'recipeImages',
  access: (allow) => ({
    'recipe-images/*': [
      allow.guest.to(['get']),
      allow.authenticated.to(['get', 'list', 'write', 'delete']),
      allow.groups(['Admins']).to(['get', 'list', 'write', 'delete']),
    ],
  }),
});
