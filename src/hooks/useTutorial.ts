import { useState, useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';

export function useTutorial() {
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
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

  const completeTutorial = () => {
    setShouldShowTutorial(false);
  };

  const skipTutorial = () => {
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
