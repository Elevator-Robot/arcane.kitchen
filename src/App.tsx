import { useState, useEffect } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import Header from './components/Header';
import MysticalEffects from './components/MysticalEffects';
import RecipeBuilder from './components/RecipeBuilder';
import OnboardingFlow from './components/OnboardingFlow';
import PostLoginTutorial from './components/PostLoginTutorial';
import { useOnboarding } from './hooks/useOnboarding';
import { useTutorial } from './hooks/useTutorial';
import { getDisplayName } from './utils/auth';
import { CURRENT_TEST_MODE } from './utils/tutorialTestMode';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnboardingRequired, completeOnboarding, onboardingData } =
    useOnboarding();
  const {
    shouldShowTutorial,
    isLoading: tutorialLoading,
    completeTutorial,
    skipTutorial,
    recheckTutorialStatus,
  } = useTutorial();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we're in development test mode
      if (import.meta.env.MODE === 'development' && CURRENT_TEST_MODE) {
        if (CURRENT_TEST_MODE.isAuthenticated) {
          setCurrentUser({ username: 'test-user' });
          setIsAuthenticated(true);
          setUserAttributes({
            given_name: CURRENT_TEST_MODE.userName,
            'custom:tutorial_complete':
              CURRENT_TEST_MODE.tutorialComplete.toString(),
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

  // Show post-login tutorial for authenticated users who have completed onboarding but not the tutorial
  if (
    isAuthenticated &&
    !authLoading &&
    !tutorialLoading &&
    shouldShowTutorial &&
    userAttributes
  ) {
    const userName = getDisplayName(userAttributes, currentUser);
    return (
      <div className="min-h-screen cottage-interior relative">
        <MysticalEffects />
        <PostLoginTutorial
          userName={userName}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      </div>
    );
  }

  // Only show main app to authenticated users who have completed onboarding and tutorial
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
