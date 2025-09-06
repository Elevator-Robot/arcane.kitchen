import { useState, useEffect } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import Header from './components/Header';
import MysticalEffects from './components/MysticalEffects';
import ChatPage from './components/ChatPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  if (authLoading) {
    return (
      <div className="min-h-screen cottage-interior flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen cottage-interior relative">
        <MysticalEffects />
        <Header
          onMenuClick={() => {}}
          isAuthenticated={isAuthenticated}
          onAuthChange={handleAuthChange}
          userAttributes={userAttributes}
        />
        <div className="flex items-center justify-center h-screen pt-20">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">🔮 Welcome to Arcane Kitchen</h1>
            <p className="text-xl mb-8">Please sign in to chat with your Mystical Sous Chef</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cottage-interior relative">
      <MysticalEffects />
      <Header
        onMenuClick={() => {}}
        isAuthenticated={isAuthenticated}
        onAuthChange={handleAuthChange}
        userAttributes={userAttributes}
      />
      <div className="pt-20 h-screen">
        <ChatPage />
      </div>
    </div>
  );
}

export default App;
