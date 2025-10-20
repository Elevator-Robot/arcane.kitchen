import React, { useState } from 'react';
import { useOnboarding } from '../hooks/useOnboarding';
import WelcomeIntro from './onboarding/WelcomeIntro';
import AvatarSelection from './onboarding/AvatarSelection';
import NameEntry from './onboarding/NameEntry';
import FeatureTutorial from './onboarding/FeatureTutorial';
import MysticalEffects from './MysticalEffects';

type OnboardingStep = 'welcome' | 'avatar' | 'name' | 'tutorial';

interface OnboardingFlowProps {
  isAuthenticated: boolean;
  onComplete: () => void;
  onSignIn?: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isAuthenticated,
  onComplete,
  onSignIn,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const { onboardingData, updateOnboardingData, completeOnboarding } = useOnboarding();

  const handleStepComplete = (step: OnboardingStep, data?: any) => {
    switch (step) {
      case 'welcome':
        setCurrentStep('avatar');
        break;
      case 'avatar':
        if (data?.avatar) {
          updateOnboardingData({ avatar: data.avatar });
        }
        setCurrentStep('name');
        break;
      case 'name':
        if (data?.name) {
          updateOnboardingData({ name: data.name });
        }
        setCurrentStep('tutorial');
        break;
      case 'tutorial':
        handleOnboardingComplete();
        break;
    }
  };

  const handleOnboardingComplete = async () => {
    await completeOnboarding(isAuthenticated);
    onComplete();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeIntro
            onContinue={() => handleStepComplete('welcome')}
            onSignIn={onSignIn}
            showSignIn={!isAuthenticated}
          />
        );
      case 'avatar':
        return (
          <AvatarSelection
            selectedAvatar={onboardingData.avatar}
            onAvatarSelect={(avatar) => handleStepComplete('avatar', { avatar })}
          />
        );
      case 'name':
        return (
          <NameEntry
            initialName={onboardingData.name}
            onNameSubmit={(name) => handleStepComplete('name', { name })}
          />
        );
      case 'tutorial':
        return (
          <FeatureTutorial
            userName={onboardingData.name}
            onComplete={() => handleStepComplete('tutorial')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen cottage-interior relative overflow-hidden">
      <MysticalEffects />
      
      {/* Progress Indicator - Only show after welcome */}
      {currentStep !== 'welcome' && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex space-x-3">
            {['avatar', 'name', 'tutorial'].map((step, index) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  getCurrentStepIndex() > index
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                    : getCurrentStepIndex() === index
                    ? 'bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse'
                    : 'bg-stone-600/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="relative z-10">
        {renderCurrentStep()}
      </div>

      {/* Mystical particles for atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-4 h-4 bg-emerald-400/20 rounded-full animate-mystical-float"></div>
        <div
          className="absolute top-40 right-32 w-3 h-3 bg-amber-400/20 rounded-full animate-mystical-float"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-5 h-5 bg-purple-400/20 rounded-full animate-mystical-float"
          style={{ animationDelay: '4s' }}
        ></div>
        <div
          className="absolute bottom-40 right-20 w-2 h-2 bg-emerald-400/20 rounded-full animate-mystical-float"
          style={{ animationDelay: '6s' }}
        ></div>
      </div>
    </div>
  );

  function getCurrentStepIndex(): number {
    const stepOrder = ['avatar', 'name', 'tutorial'];
    return stepOrder.indexOf(currentStep);
  }
};

export default OnboardingFlow;