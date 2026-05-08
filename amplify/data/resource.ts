import { defineData, a } from '@aws-amplify/backend';
import { ClientSchema } from '@aws-amplify/backend';

const Quantity = a.customType({
  amount: a.float().required(),
  unit: a.string().required(),
});

const Rating = a.customType({
  userId: a.string().required(),
  score: a.integer().required(),
});

const schema = a.schema({
  Recipe: a
    .model({
      id: a.id(),
      name: a.string().required(),
      description: a.string(),
      createdBy: a.string().required(),
      instructions: a.string().array(),
      prepTime: a.string(),
      tags: a.string().array(),
      imageUrl: a.string(),
      ratings: a.ref('Rating').array(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Ingredient: a
    .model({
      id: a.id(),
      name: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  RecipeIngredient: a
    .model({
      id: a.id(),
      recipeId: a.id().required(),
      ingredientId: a.id().required(),
      quantity: a.ref('Quantity').required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Quantity,
  Rating,
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

export type Schema = ClientSchema<typeof schema>;
