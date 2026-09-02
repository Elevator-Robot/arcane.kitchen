import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  groups: ['Admins'],
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
    // NOTE: the Cognito pool schema is immutable after creation, and this pool
    // already exists in the deployed environment. Do NOT add new standard or
    // custom attributes here — it breaks the stack update. Persisted profile
    // fields must map to attributes that already exist: nickname, custom:bio,
    // custom:avatar, and the character-preference customs below.
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
    'custom:avatar': {
      dataType: 'String',
      mutable: true,
    },
    'custom:bio': {
      dataType: 'String',
      mutable: true,
    },
  },
});
