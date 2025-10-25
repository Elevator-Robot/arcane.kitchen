import { useState, useEffect } from 'react';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { CURRENT_TEST_MODE } from '../utils/tutorialTestMode';

export function useTutorial() {
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    // Don't check again if we've already checked this session and user completed/skipped
    if (hasChecked && !shouldShowTutorial) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if we're in development test mode
      if (import.meta.env.MODE === 'development' && CURRENT_TEST_MODE) {
        setShouldShowTutorial(!CURRENT_TEST_MODE.tutorialComplete);
        setIsLoading(false);
        setHasChecked(true);
        return;
      }

      const userAttributes = await fetchUserAttributes();
      const tutorialComplete = userAttributes['custom:tutorial_complete'];

      // If attribute doesn't exist, initialize it as 'false' (first login)
      if (tutorialComplete === undefined || tutorialComplete === null) {
        try {
          await updateUserAttributes({
            userAttributes: {
              'custom:tutorial_complete': 'false',
            },
          });
          // Show tutorial for first-time users
          setShouldShowTutorial(true);
          setHasChecked(true);
        } catch (error) {
          console.error('Failed to initialize tutorial attribute:', error);
          // Show tutorial anyway - better safe than sorry
          setShouldShowTutorial(true);
          setHasChecked(true);
        }
      } else {
        // Attribute exists - check its value
        const isComplete = tutorialComplete === 'true';
        setShouldShowTutorial(!isComplete);
        setHasChecked(true);
      }
    } catch (error) {
      console.error('Failed to check tutorial status:', error);
      // If we can't check, don't show tutorial to avoid blocking user
      setShouldShowTutorial(false);
      setHasChecked(true);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTutorial = async () => {
    // Mark as checked and hide the tutorial permanently this session
    setHasChecked(true);
    setShouldShowTutorial(false);
  };

  const skipTutorial = async () => {
    // Mark as checked and hide the tutorial permanently this session
    setHasChecked(true);
    setShouldShowTutorial(false);
  };

  const recheckTutorialStatus = async () => {
    // Reset hasChecked to allow rechecking (for after account creation)
    setHasChecked(false);
    await checkTutorialStatus();
  };

  return {
    shouldShowTutorial,
    isLoading,
    completeTutorial,
    skipTutorial,
    recheckTutorialStatus,
  };
}
