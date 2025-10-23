import { useState, useEffect } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import Header from './components/Header';
import MysticalEffects from './components/MysticalEffects';
import RecipeBuilder from './components/RecipeBuilder';
import OnboardingFlow from './components/OnboardingFlow';
import { useOnboarding } from './hooks/useOnboarding';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnboardingRequired, completeOnboarding, onboardingData } =
    useOnboarding();

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

  // Show onboarding for first-time users
  // All users must go through character creation and be authenticated
  const shouldShowOnboarding =
    !authLoading && (!isAuthenticated || isOnboardingRequired);

  if (shouldShowOnboarding) {
    return (
      <OnboardingFlow
        isAuthenticated={isAuthenticated}
        onComplete={() => completeOnboarding(isAuthenticated)}
        onAuthChange={handleAuthChange}
      />
    );
  }

  // Only show main app to authenticated users who have completed onboarding
  return (
    <div className="min-h-screen cottage-interior relative">
      <MysticalEffects />

      {authLoading ? null : (
        <>
          <Header
            isAuthenticated={isAuthenticated}
            onAuthChange={handleAuthChange}
            userAttributes={userAttributes}
            showAuthModal={showAuthModal}
            setShowAuthModal={setShowAuthModal}
            prefilledData={onboardingData}
          />

          <div className="flex flex-col h-screen">
            <RecipeBuilder
              isAuthenticated={isAuthenticated}
              currentUser={currentUser}
              userAttributes={userAttributes}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
