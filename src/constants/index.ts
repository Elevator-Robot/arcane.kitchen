// Authentication modes
export const AUTH_MODES = {
  SIGNIN: 'signin',
  SIGNUP: 'signup', 
  CONFIRM: 'confirm',
  ACCOUNT: 'account',
  UPDATE_PASSWORD: 'updatePassword'
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error'
} as const;

// Message roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const;

// Quick message examples
export const QUICK_MESSAGES = [
  { title: "Grandmother's Bread", description: "How do I make traditional sourdough bread?" },
  { title: "Hearty Stews", description: "What's a good recipe for winter stew?" },
  { title: "Preserving Harvest", description: "How to preserve vegetables for winter?" },
  { title: "Comfort Foods", description: "What are some warming comfort food recipes?" },
  { title: "Garden to Table", description: "How to cook with fresh garden vegetables?" },
  { title: "Family Traditions", description: "Help me recreate my family's traditional recipes" }
] as const;

// Error messages
export const ERROR_MESSAGES = {
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  NAME_REQUIRED: 'Name is required.',
  AVATAR_REQUIRED: 'Please choose an avatar.',
  SIGNIN_FAILED: 'Failed to sign in. Please check your credentials.',
  SIGNUP_FAILED: 'Failed to create account. Please try again.',
  CONFIRM_FAILED: 'Failed to confirm account. Please check the code.',
  UPDATE_PROFILE_FAILED: 'Failed to update profile.',
  UPDATE_PASSWORD_FAILED: 'Failed to update your password.',
  DELETE_ACCOUNT_FAILED: 'Failed to delete your account. Please try again.',
  SIGNOUT_FAILED: 'Failed to leave the coven.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_UPDATED: 'Your password has been updated successfully!',
  ACCOUNT_DELETED: 'Your account has been permanently deleted.'
} as const;

// Animation delays
export const ANIMATION_DELAYS = {
  NOTIFICATION_AUTO_HIDE: 4000,
  AI_RESPONSE_DELAY: 1000
} as const;