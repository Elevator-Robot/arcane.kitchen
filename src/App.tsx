import { useState, useEffect } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import Header from './components/Header';
import MysticalEffects from './components/MysticalEffects';
import ChatInterface from './components/ChatInterface';
import CharacterBuilder, { type CharacterData } from './components/CharacterBuilder';
import RecipeBuilder from './components/RecipeBuilder';

type AppView = 'characterBuilder' | 'recipeBuilder' | 'chat';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('recipeBuilder');
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [showCharacterBuilder, setShowCharacterBuilder] = useState(false);

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

  const handleCharacterComplete = (data: CharacterData) => {
    setCharacterData(data);
    setShowCharacterBuilder(false);
    setCurrentView('recipeBuilder');
  };

  const handleSkipCharacterBuilder = () => {
    setShowCharacterBuilder(false);
    setCurrentView('recipeBuilder');
  };

  // Check if we should show character builder for new authenticated users
  useEffect(() => {
    if (isAuthenticated && !authLoading && !characterData) {
      // For now, don't force character builder - let users discover it
      // You could add logic here to check if user has completed character setup
    }
  }, [isAuthenticated, authLoading, characterData]);

  // Show character builder if explicitly requested
  if (showCharacterBuilder) {
    return (
      <CharacterBuilder
        isAuthenticated={isAuthenticated}
        userAttributes={userAttributes}
        onComplete={handleCharacterComplete}
        onSkip={handleSkipCharacterBuilder}
      />
    );
  }

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
            characterData={characterData}
            onShowCharacterBuilder={() => setShowCharacterBuilder(true)}
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
                characterData={characterData}
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
