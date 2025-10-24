import { useState, useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { CURRENT_TEST_MODE } from '../utils/tutorialTestMode';

export function useTutorial() {
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      // Check if we're in development test mode
      if (import.meta.env.MODE === 'development' && CURRENT_TEST_MODE) {
        setShouldShowTutorial(!CURRENT_TEST_MODE.tutorialComplete);
        setIsLoading(false);
        return;
      }

      const userAttributes = await fetchUserAttributes();
      const tutorialComplete = userAttributes['custom:tutorial_complete'];

      // Show tutorial if user hasn't completed it yet
      // tutorial_complete could be undefined, 'false', or 'true'
      const isComplete = tutorialComplete === 'true';
      setShouldShowTutorial(!isComplete);
    } catch (error) {
      console.error('Failed to check tutorial status:', error);
      // If we can't check, don't show tutorial to avoid blocking user
      setShouldShowTutorial(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTutorial = async () => {
    // Immediately hide the tutorial
    setShouldShowTutorial(false);
  };

  const skipTutorial = async () => {
    // Immediately hide the tutorial  
    setShouldShowTutorial(false);
  };

  return {
    shouldShowTutorial,
    isLoading,
    completeTutorial,
    skipTutorial,
    recheckTutorialStatus: checkTutorialStatus,
  };
}
