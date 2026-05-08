import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['EMAIL', 'PROFILE', 'OPENID'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          nickname: 'name',
        },
      },
      callbackUrls: [
        'http://localhost:5173/',
        'http://127.0.0.1:5173/',
      ],
      logoutUrls: [
        'http://localhost:5173/',
        'http://127.0.0.1:5173/',
      ],
      domainPrefix: 'arcane-kitchen-auth',
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
