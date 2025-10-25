import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    nickname: {
      required: true,
      mutable: true,
    },
    // Store character preferences in user profile
    'custom:cookingStyle': {
      dataType: 'String',
      mutable: true,
    },
    'custom:magicalSpecialty': {
      dataType: 'String',
      mutable: true,
    },
    'custom:favoriteIngredients': {
      dataType: 'String', // JSON string of array
      mutable: true,
    },
    'custom:tutorial_complete': {
      dataType: 'String', // Store as 'true' or 'false' string
      mutable: true,
    },
  },
});
