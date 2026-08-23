import { defineData, a } from '@aws-amplify/backend';
import { ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Recipe: a
    .model({
      id: a.id(),
      name: a.string().required(),
      ownerId: a.string().required(),
      description: a.string(),
      createdBy: a.string().required(),
      instructions: a.string().array(),
      prepTime: a.string(),
      tags: a.string().array(),
      utensils: a.string().array(),
      imageUrl: a.string(),
      notes: a.string(),
      recipeNameKey: a.string(),
      recipeFingerprint: a.string(),
      ratings: a.json().array(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('ownerId'),
      allow.group('Admins'),
      allow.authenticated().to(['read']),
      allow.guest().to(['read']),
    ]),

  Ingredient: a
    .model({
      id: a.id(),
      name: a.string().required(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.guest().to(['read']),
    ]),

  RecipeIngredient: a
    .model({
      id: a.id(),
      recipeId: a.id().required(),
      ingredientId: a.id().required(),
      quantity: a.json().required(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.guest().to(['read']),
    ]),

  Favorite: a
    .model({
      id: a.id(),
      userId: a.string().required(),
      recipeId: a.id().required(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('Admins'),
      allow.authenticated().to(['read']),
      allow.guest().to(['read']),
    ]),

  Comment: a
    .model({
      id: a.id(),
      recipeId: a.id().required(),
      userId: a.string().required(),
      author: a.string().required(),
      content: a.string().required(),
      parentId: a.id(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.authenticated().to(['read']),
    ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

export type Schema = ClientSchema<typeof schema>;
