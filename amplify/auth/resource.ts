import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        attributeMapping: {
          email: 'email',
          nickname: 'given_name',
        },
        scopes: ['email', 'profile', 'openid'],
      },
      callbackUrls: [
        'https://arcane.kitchen/',
        'https://www.arcane.kitchen/',
        'http://localhost:5173/',
        'http://127.0.0.1:5173/',
      ],
      logoutUrls: [
        'https://arcane.kitchen/',
        'https://www.arcane.kitchen/',
        'http://localhost:5173/',
        'http://127.0.0.1:5173/',
      ],
    },
  },
  userAttributes: {
    nickname: {
      required: false,
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
  },
});
