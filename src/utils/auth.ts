/**
 * Get display name from user attributes
 */
export const getDisplayName = (userAttributes?: any, currentUser?: any): string => {
  if (!userAttributes) return 'Kitchen Witch';
  
  return (
    userAttributes.given_name || 
    userAttributes.nickname || 
    userAttributes.name || 
    userAttributes.email?.split('@')[0] || 
    currentUser?.username ||
    'Kitchen Witch'
  );
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number.' };
  }
  
  return { isValid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};