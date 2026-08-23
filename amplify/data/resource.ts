import { defineData, defineFunction, a } from '@aws-amplify/backend';
import { ClientSchema } from '@aws-amplify/backend';
import { Aws } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const listAdminUsers = defineFunction((scope) => {
  const lambda = new NodejsFunction(scope, 'ListAdminUsers', {
    entry: path.join(path.dirname(fileURLToPath(import.meta.url)), '../functions/list-admin-users/handler.ts'),
    runtime: Runtime.NODEJS_20_X,
  });

  lambda.addToRolePolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['cognito-idp:ListUsers'],
    resources: [`arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`],
  }));

  return lambda;
});

const schema = a.schema({
  AdminUser: a.customType({
    userId: a.string().required(),
    username: a.string().required(),
    email: a.string(),
    displayName: a.string(),
    status: a.string().required(),
    enabled: a.boolean().required(),
    createdAt: a.datetime(),
  }),

  listAdminUsers: a
    .query()
    .returns(a.ref('AdminUser').array())
    .authorization((allow) => [allow.group('Admins')])
    .handler(a.handler.function(listAdminUsers)),

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
      isHidden: a.boolean().default(false),
      hiddenAt: a.datetime(),
      hiddenBy: a.string(),
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
      isHidden: a.boolean().default(false),
      hiddenAt: a.datetime(),
      hiddenBy: a.string(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('Admins'),
      allow.authenticated().to(['read']),
    ]),

  UserProfile: a
    .model({
      id: a.id(),
      userId: a.string().required(),
      username: a.string().required(),
      displayName: a.string().required(),
      bio: a.string(),
      avatar: a.string(),
      needsUsernameSetup: a.boolean(),
      isBanned: a.boolean().default(false),
      isDeleted: a.boolean().default(false),
      contentHidden: a.boolean().default(false),
      moderationUpdatedAt: a.datetime(),
      moderationUpdatedBy: a.string(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('Admins'),
    ]),

  AdminAuditLog: a
    .model({
      id: a.id(),
      actorUserId: a.string().required(),
      action: a.string().required(),
      targetType: a.string().required(),
      targetId: a.string().required(),
      before: a.json(),
      after: a.json(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.group('Admins').to(['read']),
    ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

export type Schema = ClientSchema<typeof schema>;
