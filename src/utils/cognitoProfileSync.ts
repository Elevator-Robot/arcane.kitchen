import { updateUserAttributes } from 'aws-amplify/auth';
import { isMockPreview } from '../preview/config';

export type CognitoProfileFields = {
  displayName?: string;
  bio?: string;
  avatar?: string | null;
};

/**
 * Best-effort mirror of profile edits into Cognito user attributes.
 * The backend UserProfile is the source of truth; localStorage is only a
 * session/first-paint cache for the existing UI. Attribute mappings:
 *   displayName -> nickname
 *   bio          -> custom:bio
 *   avatar       -> custom:avatar
 *
 * NOTE: the deployed Cognito pool schema is immutable; these mappings only use
 * attributes that already exist in the pool. The username (handle) cannot be
 * persisted to Cognito without recreating the pool (which deletes all users),
 * so it remains in localStorage + the DynamoDB-backed UserProfile model.
 */
export const syncProfileToCognito = async (fields: CognitoProfileFields) => {
  if (isMockPreview) return;
  const userAttributes: Record<string, string> = {};

  if (fields.displayName !== undefined) {
    userAttributes.nickname = fields.displayName;
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
