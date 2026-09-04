import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
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
        endpoint: process.env.DATA_GRAPHQL_ENDPOINT!,
        region: process.env.AWS_REGION!,
        defaultAuthMode: 'identityPool',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => {
          const credentials = await new Promise<AWS.Credentials>((resolve, reject) => {
            AWS.config.getCredentials((error) => {
              if (error || !AWS.config.credentials) {
                reject(error || new Error('AWS credentials are unavailable.'));
                return;
              }
              resolve(AWS.config.credentials as AWS.Credentials);
            });
          });
          return {
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
            },
          };
        },
        clearCredentialsAndIdentityId: () => undefined,
      },
    },
  },
);

const client = generateClient<Schema>();

const errorText = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message && error.message !== '[object Object]') return error.message;
    const details = Object.fromEntries(Object.getOwnPropertyNames(error).map((key) => [key, (error as any)[key]]));
    if (Object.keys(details).length) return JSON.stringify(details);
    return '';
  }
  if (error == null) return '';
  if (typeof error === 'string') return error !== '[object Object]' ? error : '';
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; cause?: unknown; details?: unknown; errors?: unknown };
    for (const nested of [record.message, record.cause, record.details, record.errors]) {
      const message: string = errorText(nested);
      if (message) return message;
    }
    try { return JSON.stringify(error) || ''; } catch { /* use fallback */ }
  }
  return 'The data operation failed.';
};

const request = async <T>(query: string, variables: Record<string, unknown>) => {
  const result = await client.graphql({ query, variables }) as { data?: T; errors?: Array<{ message: string }> };
  if (result.errors?.length) throw new Error(result.errors.map(errorText).join(', '));
  if (!result.data) throw new Error('The data operation returned no result.');
  return result.data;
};

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
  await request<{ createAdminAuditLog: unknown }>(`mutation CreateAdminAuditLog($input: CreateAdminAuditLogInput!) {
    createAdminAuditLog(input: $input) { id }
  }`, {
    input: {
      actorUserId: actorId(event), action, targetType, targetId,
      before, after, createdAt: new Date().toISOString(),
    },
  });
};

const findProfile = async (userId: string) => {
  const result = await request<{ listUserProfiles: { items: any[] } }>(`query ListUserProfiles($filter: ModelUserProfileFilterInput) {
    listUserProfiles(filter: $filter) { items { id userId username displayName bio avatar isBanned isDeleted contentHidden moderationUpdatedAt moderationUpdatedBy } }
  }`, { filter: { userId: { eq: userId } } });
  return result.listUserProfiles.items[0] ?? null;
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

  await request<{ updateUserProfile: unknown }>(`mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
    updateUserProfile(input: $input) { id }
  }`, { input: { id: profile.id, ...next } });

  const [recipeResult, commentResult] = await Promise.all([
    request<{ listRecipes: { items: any[] } }>(`query ListRecipes($filter: ModelRecipeFilterInput) {
      listRecipes(filter: $filter) { items { id ownerId } }
    }`, { filter: { ownerId: { eq: userId } } }),
    request<{ listComments: { items: any[] } }>(`query ListComments($filter: ModelCommentFilterInput) {
      listComments(filter: $filter) { items { id userId } }
    }`, { filter: { userId: { eq: userId } } }),
  ]);

  const hidden = next.contentHidden === true;
  await Promise.all([
    ...(recipeResult.listRecipes.items ?? []).map((recipe) => request(`mutation UpdateRecipe($input: UpdateRecipeInput!) {
      updateRecipe(input: $input) { id }
    }`, { input: { id: recipe.id, isHidden: hidden, hiddenAt: hidden ? next.moderationUpdatedAt : null, hiddenBy: hidden ? actorId(event) : null } })),
    ...(commentResult.listComments.items ?? []).map((comment) => request(`mutation UpdateComment($input: UpdateCommentInput!) {
      updateComment(input: $input) { id }
    }`, { input: { id: comment.id, isHidden: hidden, hiddenAt: hidden ? next.moderationUpdatedAt : null, hiddenBy: hidden ? actorId(event) : null } })),
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
    const result = await request<{ getRecipe: any }>(`query GetRecipe($id: ID!) {
      getRecipe(id: $id) { id ownerId createdBy }
    }`, { id: recipeId });
    if (!result.getRecipe) throw new Error(`Recipe ${recipeId} could not be found.`);
    return result.getRecipe;
  }));
  const userIds = new Set(transfers.flatMap((transfer, index) => [recipes[index].ownerId, transfer.newOwnerId]));
  const profiles = new Map<string, any>();
  await Promise.all([...userIds].map(async (userId) => {
    const profile = await findProfile(userId);
    if (!profile) throw new Error(`Destination user ${userId} could not be found.`);
    profiles.set(userId, profile);
  }));

  const updatedRecipes: typeof recipes = [];
  try {
    for (const [index, recipe] of recipes.entries()) {
      await request(`mutation UpdateRecipe($input: UpdateRecipeInput!) {
        updateRecipe(input: $input) { id }
      }`, { input: {
        id: recipe.id,
        ownerId: transfers[index].newOwnerId,
        createdBy: `@${profiles.get(transfers[index].newOwnerId).username}`,
      } });
      updatedRecipes.push(recipe);
    }
  } catch (transferError) {
    await Promise.all(updatedRecipes.map((recipe) => request(`mutation UpdateRecipe($input: UpdateRecipeInput!) {
      updateRecipe(input: $input) { id }
      }`, { input: { id: recipe.id, ownerId: recipe.ownerId, createdBy: recipe.createdBy } })));
    throw new Error(`Ownership transfer rolled back: ${transferError instanceof Error ? transferError.message : 'the update failed.'}`);
  }

  await audit(event, 'transferOwnership', 'RecipeBatch', recipes.map((recipe) => recipe.id).join(','),
    recipes.map((recipe) => ({ recipeId: recipe.id, ownerId: recipe.ownerId })),
    transfers,
  );
  return { success: true, message: `${transfers.length} recipe ownership transfer(s) completed.` };
};

export const handler = async (event: Event) => {
  try {
    if (!isAdmin(event)) throw new Error('Administrator access is required.');
    const action = event.arguments?.action;
    if (!action) throw new Error('An admin action is required.');
    if (action === 'transferOwnership') return transferOwnership(event, event.arguments?.transfers ?? []);
    if (!event.arguments?.userId) throw new Error('A target user is required.');
    if (!['delete', 'ban', 'unban', 'hideContent', 'restoreContent', 'restore'].includes(action)) throw new Error('Unsupported admin action.');
    return moderateUser(event, action, event.arguments.userId);
  } catch (error) {
    return {
      success: false,
      message: errorText(error) || 'The admin action failed in the backend.',
    };
  }
};
