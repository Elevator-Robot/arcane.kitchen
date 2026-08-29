import AWS from 'aws-sdk';

type AppSyncEvent = {
  identity?: {
    claims?: Record<string, unknown>;
  };
};

type AdminUser = {
  userId: string;
  username: string;
  email?: string;
  displayName?: string;
  status: string;
  enabled: boolean;
  createdAt?: string;
};

const cognito = new AWS.CognitoIdentityServiceProvider();

const getAttribute = (attributes: AWS.CognitoIdentityServiceProvider.AttributeType[] | undefined, name: string) =>
  attributes?.find((attribute) => attribute.Name === name)?.Value;

const isAdmin = (event: AppSyncEvent) => {
  const groups = event.identity?.claims?.['cognito:groups'];
  return Array.isArray(groups) ? groups.includes('Admins') : groups === 'Admins';
};

const getUserPoolId = (event: AppSyncEvent) => {
  const issuer = event.identity?.claims?.iss;
  if (typeof issuer !== 'string') {
    throw new Error('The authenticated user pool issuer is unavailable.');
  }

  const userPoolId = issuer.split('/').pop();
  if (!userPoolId) {
    throw new Error('The authenticated user pool ID is unavailable.');
  }

  return userPoolId;
};

export const handler = async (event: AppSyncEvent): Promise<AdminUser[]> => {
  if (!isAdmin(event)) {
    throw new Error('Administrator access is required.');
  }

  const users: AdminUser[] = [];
  let paginationToken: string | undefined;

  do {
    const result = await cognito.listUsers({
      UserPoolId: getUserPoolId(event),
      Limit: 60,
      PaginationToken: paginationToken,
    }).promise();

    for (const user of result.Users ?? []) {
      const email = getAttribute(user.Attributes, 'email');
      const displayName =
        getAttribute(user.Attributes, 'nickname') ||
        getAttribute(user.Attributes, 'name') ||
        email?.split('@')[0] ||
        user.Username ||
        'Cook';

      if (!user.Username || !user.UserCreateDate) continue;

      users.push({
        userId: getAttribute(user.Attributes, 'sub') || user.Username,
        username: user.Username,
        email,
        displayName,
        status: user.UserStatus || 'UNKNOWN',
        enabled: user.Enabled !== false,
        createdAt: user.UserCreateDate.toISOString(),
      });
    }

    paginationToken = result.PaginationToken;
  } while (paginationToken);

  return users;
};
