import React, { useState } from 'react';
import { updateUserAttributes } from 'aws-amplify/auth';

interface PostLoginTutorialProps {
  userName: string;
  onComplete: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'mystical-sous-chef',
    title: 'Mystical Sous Chef',
    description: 'Your AI-powered culinary companion awaits in the kitchen',
    icon: '🧙‍♀️',
    details: [
      'Ask for personalized recipe suggestions and cooking guidance',
      'Get intelligent recommendations based on your magical preferences',
      'Learn about ingredient properties and mystical correspondences',
      'Receive step-by-step cooking assistance from your sous chef',
    ],
  },
  {
    id: 'recipe-discovery',
    title: 'Recipe Discovery',
    description: 'Explore culinary treasures from across the mystical realms',
    icon: '📜',
    details: [
      'Browse enchanted recipes by region, ingredient, or magical properties',
      'Discover ancient and innovative culinary techniques',
      'Find recipes perfectly suited to your dietary enchantments',
      'Explore seasonal celebrations and ritual feast preparations',
    ],
  },
  {
    id: 'personal-grimoire',
    title: 'Personal Grimoire',
    description: 'Build your own mystical cookbook collection',
    icon: '📖',
    details: [
      'Save your most treasured recipes for instant access',
      'Create custom spell-books and magical meal plans',
      'Add personal notes and alchemical modifications',
      'Share your culinary creations with the coven community',
    ],
  },
  {
    id: 'alchemical-transformations',
    title: 'Alchemical Transformations',
    description: 'Transform recipes to suit your mystical needs',
    icon: '⚗️',
    details: [
      'Adapt ancient recipes for modern dietary restrictions',
      'Scale ingredient portions for gatherings large and small',
      'Substitute components with magical alternatives',
      'Transform traditional recipes with contemporary techniques',
    ],
  },
];

const PostLoginTutorial: React.FC<PostLoginTutorialProps> = ({
  userName,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const markTutorialComplete = async () => {
    // Prevent multiple calls
    if (hasMarkedComplete) {
      return;
    }
    
    setHasMarkedComplete(true);
    
    try {
      await updateUserAttributes({
        userAttributes: {
          'custom:tutorial_complete': 'true', // Cognito custom attributes are always strings
        },
      });
    } catch (error) {
      console.error('Failed to mark tutorial as complete:', error);
      // Continue anyway - don't block the user
    }
  };

  const handleNext = async () => {
    if (isLastStep) {
      setIsCompleting(true);
      await markTutorialComplete();
      onComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Tutorial Modal */}
        <div className="bg-gradient-to-br from-stone-800/95 via-green-900/40 to-amber-900/40 backdrop-blur-lg border-2 border-emerald-400/60 rounded-3xl p-6 md:p-10 shadow-2xl shadow-emerald-500/20 relative">
          {/* Mystical corner decorations */}
          <div className="absolute top-4 left-4 text-2xl opacity-30">✦</div>
          <div className="absolute top-4 right-4 text-2xl opacity-30">✦</div>
          <div className="absolute bottom-4 left-4 text-2xl opacity-30">✦</div>
          <div className="absolute bottom-4 right-4 text-2xl opacity-30">✦</div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-3">
              Welcome Back, {userName}! 🌙
            </h1>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-4"></div>
            <p className="text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
              Let us guide you through the mystical powers at your command in
              the Arcane Kitchen
            </p>
          </div>

          {/* Step Progress Indicator */}
          <div className="flex justify-center space-x-3 mb-8">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  index < currentStepIndex
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                    : index === currentStepIndex
                      ? 'bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse'
                      : 'bg-stone-600/50'
                }`}
              />
            ))}
          </div>

          {/* Feature Showcase */}
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-7xl mb-6 filter drop-shadow-lg">
              {currentStep.icon}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-200 mb-4">
              {currentStep.title}
            </h2>
            <p className="text-xl text-emerald-300 mb-8 font-semibold">
              {currentStep.description}
            </p>

            {/* Feature Details */}
            <div className="bg-gradient-to-r from-stone-900/40 to-stone-800/40 rounded-xl p-6 mb-8 border border-stone-700/30">
              <ul className="space-y-4 text-left">
                {currentStep.details.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-3 text-stone-300"
                  >
                    <span className="text-emerald-400 mt-1 text-sm">✦</span>
                    <span className="leading-relaxed">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                currentStepIndex === 0
                  ? 'invisible'
                  : 'bg-stone-700/60 text-stone-300 border border-stone-600/50 hover:bg-stone-600/60 hover:border-stone-500/50 hover:text-stone-200'
              }`}
            >
              ← Previous
            </button>

            <div className="text-sm text-stone-400 font-medium">
              Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
            </div>

            <button
              onClick={handleNext}
              disabled={isCompleting}
              className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
            >
              {isCompleting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Completing...
                </div>
              ) : isLastStep ? (
                'Complete Tutorial →'
              ) : (
                'Next →'
              )}
            </button>
          </div>

          {/* Mystical Quote */}
          <div className="text-center mt-8 pt-6 border-t border-stone-700/30">
            <p className="text-sm text-stone-400/80 italic max-w-2xl mx-auto leading-relaxed">
              "The kitchen is a sacred space where mundane ingredients transform
              into magical sustenance. Master these arts, and nourishment
              becomes enchantment." 🕯️
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostLoginTutorial;
