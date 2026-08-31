type ErrorLike = {
  name?: unknown;
  message?: unknown;
  cause?: unknown;
};

const getErrorDetails = (error: unknown): ErrorLike => {
  if (error instanceof Error) return error as Error & ErrorLike;
  if (error && typeof error === 'object') return error as ErrorLike;
  return {};
};

const getRawMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  const details = getErrorDetails(error);
  if (typeof details.message === 'string') return details.message;
  if (details.cause && details.cause !== error) return getRawMessage(details.cause);
  return '';
};

export const getUserFacingErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again later.',
): string => {
  const message = getRawMessage(error);
  const normalized = message.toLowerCase();

  if (!message || message === '[object object]') return fallback;
  if (
    normalized.includes('user pool client') &&
    (normalized.includes('does not exist') || normalized.includes('not found'))
  ) {
    return 'Sign-in is temporarily unavailable. Please try again later.';
  }
  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'We could not reach the kitchen. Check your connection and try again.';
  }
  if (normalized.includes('not authorized') || normalized.includes('access denied')) {
    return 'You do not have permission to complete that action.';
  }
  if (normalized.includes('resource not found') || normalized.includes('does not exist')) {
    return 'That resource is no longer available. Please refresh and try again.';
  }
  if (normalized.includes('already exists') || normalized.includes('usernameexists')) {
    return 'That account or username already exists.';
  }
  if (normalized.includes('invalidpassword') || normalized.includes('incorrect')) {
    return 'The email or password is incorrect.';
  }
  if (normalized.includes('code mismatch') || normalized.includes('invalid verification')) {
    return 'That verification code is invalid. Check it and try again.';
  }

  return fallback;
};

export const reportError = (context: string, error: unknown) => {
  console.error(context, error);
  return getUserFacingErrorMessage(error);
};
