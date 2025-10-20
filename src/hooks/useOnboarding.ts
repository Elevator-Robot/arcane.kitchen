import { useState, useEffect } from 'react';
import { updateUserAttributes } from 'aws-amplify/auth';

export interface OnboardingData {
  avatar: string;
  name: string;
  cookingStyle?: string;
  favoriteIngredients?: string[];
  magicalSpecialty?: string;
  isCompleted: boolean;
}

const ONBOARDING_STORAGE_KEY = 'arcane_onboarding_data';
const ONBOARDING_PREFILL_KEY = 'arcane_onboarding_prefill';

export function useOnboarding() {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    avatar: '',
    name: '',
    isCompleted: false,
  });

  const [isOnboardingRequired, setIsOnboardingRequired] = useState(true);

  useEffect(() => {
    // Check if onboarding was completed in this session
    const storedData = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.isCompleted) {
          setOnboardingData(parsed);
          setIsOnboardingRequired(false);
        } else {
          // Load partial data if not completed
          setOnboardingData(parsed);
        }
      } catch (error) {
        console.error('Error parsing onboarding data:', error);
      }
    }
  }, []);

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    const newData = { ...onboardingData, ...updates };
    setOnboardingData(newData);

    // Store in session storage for trial mode
    sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newData));
    
    // Also store in localStorage for prefill when creating account
    localStorage.setItem(ONBOARDING_PREFILL_KEY, JSON.stringify({
      avatar: newData.avatar,
      name: newData.name,
    }));
  };

  const completeOnboarding = async (isAuthenticated: boolean = false) => {
    const completedData = { ...onboardingData, isCompleted: true };
    setOnboardingData(completedData);
    setIsOnboardingRequired(false);

    // Store in session storage
    sessionStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify(completedData)
    );

    // If authenticated, also save to Cognito user attributes
    if (isAuthenticated && onboardingData.name && onboardingData.avatar) {
      try {
        await updateUserAttributes({
          userAttributes: {
            given_name: onboardingData.name,
            picture: onboardingData.avatar,
            'custom:cooking_style': onboardingData.cookingStyle || '',
            'custom:magical_specialty': onboardingData.magicalSpecialty || '',
            'custom:favorite_ingredients':
              onboardingData.favoriteIngredients?.join(',') || '',
          },
        });
      } catch (error) {
        console.error(
          'Failed to save character data to user attributes:',
          error
        );
      }
    }
  };

  const resetOnboarding = () => {
    sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setOnboardingData({
      avatar: '',
      name: '',
      isCompleted: false,
    });
    setIsOnboardingRequired(true);
  };

  return {
    onboardingData,
    isOnboardingRequired,
    updateOnboardingData,
    completeOnboarding,
    resetOnboarding,
  };
}
