import { useState, useEffect } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import Header from './components/Header';
import MysticalEffects from './components/MysticalEffects';
import ChatInterface from './components/ChatInterface';
import RecipeBuilder from './components/RecipeBuilder';

type AppView = 'recipeBuilder' | 'chat';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('recipeBuilder');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);

      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
    } catch (error) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setUserAttributes(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthChange = async () => {
    setAuthLoading(true);
    await checkAuthStatus();
  };

  return (
    <div className="min-h-screen cottage-interior relative">
      <MysticalEffects />

      {authLoading ? null : (
        <>
          <Header
            onMenuClick={() => {
              if (currentView === 'recipeBuilder') {
                setCurrentView('chat');
              } else {
                setCurrentView('recipeBuilder');
              }
            }}
            isAuthenticated={isAuthenticated}
            onAuthChange={handleAuthChange}
            userAttributes={userAttributes}
          />

          <div className="flex flex-col h-screen pt-20">
            {currentView === 'chat' ? (
              <ChatInterface
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                userAttributes={userAttributes}
              />
            ) : (
              <RecipeBuilder
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                userAttributes={userAttributes}
                onShowChat={() => setCurrentView('chat')}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
