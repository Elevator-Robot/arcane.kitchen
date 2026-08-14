import { updateUserAttributes } from 'aws-amplify/auth';

export type CognitoProfileFields = {
  displayName?: string;
  username?: string;
  bio?: string;
  avatar?: string | null;
};

/**
 * Best-effort mirror of profile edits into Cognito user attributes.
 * Cognito is the source of truth for user profiles; localStorage is only a
 * session/first-paint cache for the existing UI. Attribute mappings:
 *   displayName -> name
 *   username     -> preferred_username
 *   bio          -> custom:bio
 *   avatar       -> custom:avatar
 */
export const syncProfileToCognito = async (fields: CognitoProfileFields) => {
  const userAttributes: Record<string, string> = {};

  if (fields.displayName !== undefined) {
    userAttributes.name = fields.displayName;
  }
  if (fields.username !== undefined) {
    userAttributes.preferred_username = fields.username;
  }
  if (fields.bio !== undefined) {
    userAttributes['custom:bio'] = fields.bio;
  }
  if (fields.avatar !== undefined) {
    userAttributes['custom:avatar'] = fields.avatar ?? '';
  }

  if (Object.keys(userAttributes).length === 0) return;

  try {
    await updateUserAttributes({ userAttributes });
  } catch (error) {
    // best effort: localStorage + the data backend keep the session working
    console.error('Failed to sync profile to Cognito', error);
  }
};