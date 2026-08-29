import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/admin-actions';
import AWS from 'aws-sdk';

type Event = {
  arguments?: {
    action?: string;
    userId?: string;
    transfers?: Array<{ recipeId: string; newOwnerId: string }>;
  };
  identity?: { claims?: Record<string, unknown> };
};

const cognito = new AWS.CognitoIdentityServiceProvider();

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.data_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: 'identityPool',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
        }),
        clearCredentialsAndIdentityId: () => undefined,
      },
    },
  },
);

const client = generateClient<Schema>();

const isAdmin = (event: Event) => {
  const groups = event.identity?.claims?.['cognito:groups'];
  return Array.isArray(groups) ? groups.includes('Admins') : groups === 'Admins';
};

const actorId = (event: Event) => {
  const sub = event.identity?.claims?.sub;
  if (typeof sub !== 'string' || !sub) throw new Error('The administrator identity is unavailable.');
  return sub;
};

const poolId = (event: Event) => {
  const issuer = event.identity?.claims?.iss;
  if (typeof issuer !== 'string') throw new Error('The Cognito user pool is unavailable.');
  const id = issuer.split('/').pop();
  if (!id) throw new Error('The Cognito user pool is unavailable.');
  return id;
};

const cognitoUsername = async (event: Event, userId: string) => {
  const result = await cognito.listUsers({
    UserPoolId: poolId(event),
    Filter: `sub = "${userId.replaceAll('"', '')}"`,
    Limit: 1,
  }).promise();
  const username = result.Users?.[0]?.Username;
  if (!username) throw new Error('The Cognito user could not be found.');
  return username;
};

const audit = async (event: Event, action: string, targetType: string, targetId: string, before: unknown, after: unknown) => {
  const result = await client.models.AdminAuditLog.create({
    actorUserId: actorId(event),
    action,
    targetType,
    targetId,
    before: before as any,
    after: after as any,
    createdAt: new Date().toISOString(),
  });
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(', '));
};

const findProfile = async (userId: string) => {
  const result = await client.models.UserProfile.list({ filter: { userId: { eq: userId } } });
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(', '));
  return result.data?.[0] ?? null;
};

const moderateUser = async (event: Event, action: string, userId: string) => {
  const profile = await findProfile(userId);
  if (!profile) throw new Error('The user profile could not be found.');

  const next = {
    isBanned: action === 'ban' ? true : action === 'unban' ? false : profile.isBanned,
    isDeleted: action === 'delete' ? true : action === 'restore' ? false : profile.isDeleted,
    contentHidden: ['ban', 'delete', 'hideContent'].includes(action)
      ? true
      : action === 'restore' || action === 'restoreContent'
        ? false
        : profile.contentHidden,
    moderationUpdatedAt: new Date().toISOString(),
    moderationUpdatedBy: actorId(event),
  };

  const updatedProfile = await client.models.UserProfile.update({ id: profile.id, ...next });
  if (updatedProfile.errors?.length) throw new Error(updatedProfile.errors.map((error) => error.message).join(', '));

  const [recipeResult, commentResult] = await Promise.all([
    client.models.Recipe.list({ filter: { ownerId: { eq: userId } } }),
    client.models.Comment.list({ filter: { userId: { eq: userId } } }),
  ]);
  if (recipeResult.errors?.length || commentResult.errors?.length) {
    throw new Error([...recipeResult.errors ?? [], ...commentResult.errors ?? []].map((error) => error.message).join(', '));
  }

  const hidden = next.contentHidden === true;
  await Promise.all([
    ...(recipeResult.data ?? []).map((recipe) => client.models.Recipe.update({
      id: recipe.id,
      isHidden: hidden,
      hiddenAt: hidden ? next.moderationUpdatedAt : null,
      hiddenBy: hidden ? actorId(event) : null,
    })),
    ...(commentResult.data ?? []).map((comment) => client.models.Comment.update({
      id: comment.id,
      isHidden: hidden,
      hiddenAt: hidden ? next.moderationUpdatedAt : null,
      hiddenBy: hidden ? actorId(event) : null,
    })),
  ]);

  if (action === 'ban' || action === 'delete') {
    await cognito.adminDisableUser({ UserPoolId: poolId(event), Username: await cognitoUsername(event, userId) }).promise();
  } else if (action === 'unban' || action === 'restore') {
    await cognito.adminEnableUser({ UserPoolId: poolId(event), Username: await cognitoUsername(event, userId) }).promise();
  }

  await audit(event, action, 'UserProfile', userId, profile, { ...profile, ...next });
  return { success: true, message: `User ${action} completed.` };
};

const transferOwnership = async (event: Event, transfers: Array<{ recipeId: string; newOwnerId: string }>) => {
  if (!transfers?.length) throw new Error('At least one ownership transfer is required.');
  const uniqueRecipeIds = new Set(transfers.map((transfer) => transfer.recipeId));
  if (uniqueRecipeIds.size !== transfers.length) throw new Error('A recipe may only appear once in a transfer batch.');

  const recipes = await Promise.all(transfers.map(async ({ recipeId }) => {
    const result = await client.models.Recipe.get({ id: recipeId });
    if (result.errors?.length || !result.data) throw new Error(`Recipe ${recipeId} could not be found.`);
    return result.data;
  }));
  const userIds = new Set(transfers.flatMap((transfer, index) => [recipes[index].ownerId, transfer.newOwnerId]));
  await Promise.all([...userIds].map(async (userId) => {
    if (!(await findProfile(userId))) throw new Error(`Destination user ${userId} could not be found.`);
  }));

  const updatedRecipes: typeof recipes = [];
  try {
    for (const [index, recipe] of recipes.entries()) {
      const result = await client.models.Recipe.update({
        id: recipe.id,
        ownerId: transfers[index].newOwnerId,
      });
      if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(', '));
      updatedRecipes.push(recipe);
    }
  } catch (transferError) {
    await Promise.all(updatedRecipes.map((recipe) => client.models.Recipe.update({
      id: recipe.id,
      ownerId: recipe.ownerId,
    })));
    throw new Error(`Ownership transfer rolled back: ${transferError instanceof Error ? transferError.message : 'the update failed.'}`);
  }

  await audit(event, 'transferOwnership', 'RecipeBatch', recipes.map((recipe) => recipe.id).join(','),
    recipes.map((recipe) => ({ recipeId: recipe.id, ownerId: recipe.ownerId })),
    transfers,
  );
  return { success: true, message: `${transfers.length} recipe ownership transfer(s) completed.` };
};

export const handler = async (event: Event) => {
  if (!isAdmin(event)) throw new Error('Administrator access is required.');
  const action = event.arguments?.action;
  if (!action) throw new Error('An admin action is required.');
  if (action === 'transferOwnership') return transferOwnership(event, event.arguments?.transfers ?? []);
  if (!event.arguments?.userId) throw new Error('A target user is required.');
  if (!['delete', 'ban', 'unban', 'hideContent', 'restoreContent', 'restore'].includes(action)) throw new Error('Unsupported admin action.');
  return moderateUser(event, action, event.arguments.userId);
};
