import { useState, useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userAttributes, setUserAttributes] = useState<
    Record<string, string | undefined> | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);
        setIsAuthenticated(true);
      } catch (error) {
        console.log('User is not authenticated');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return {
    isAuthenticated,
    userAttributes,
    isLoading,
    userId: userAttributes?.sub,
  };
}
