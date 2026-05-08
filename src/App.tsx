import { useEffect, useState } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import RecipeBuilder from './components/RecipeBuilder';
import { CURRENT_TEST_MODE } from './utils/tutorialTestMode';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (import.meta.env.MODE === 'development' && CURRENT_TEST_MODE) {
          if (CURRENT_TEST_MODE.isAuthenticated) {
            setCurrentUser({ username: 'test-user' });
            setIsAuthenticated(true);
            setUserAttributes({
              given_name: CURRENT_TEST_MODE.userName,
              nickname: CURRENT_TEST_MODE.userName,
            });
          } else {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setUserAttributes(null);
          }
          setAuthLoading(false);
          return;
        }

        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        setCurrentUser(user);
        setUserAttributes(attributes);
        setIsAuthenticated(true);
      } catch {
        setCurrentUser(null);
        setUserAttributes(null);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-[#f7f3ec]" />;
  }

  return (
    <RecipeBuilder
      isAuthenticated={isAuthenticated}
      currentUser={currentUser}
      userAttributes={userAttributes}
    />
  );
}

export default App;
