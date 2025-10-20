import React, { useState } from 'react';

interface FeatureTutorialProps {
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
    description: 'Your AI-powered culinary companion awaits',
    icon: '🧙‍♀️',
    details: [
      'Ask for recipe suggestions and cooking guidance',
      'Get personalized recommendations based on your preferences',
      'Learn about ingredient properties and magical correspondences',
      'Receive step-by-step cooking assistance',
    ],
  },
  {
    id: 'recipe-discovery',
    title: 'Recipe Discovery',
    description: 'Explore culinary treasures from across the realms',
    icon: '📜',
    details: [
      'Browse recipes by region, ingredient, or magical properties',
      'Discover traditional and innovative cooking techniques',
      'Find recipes that match your dietary needs',
      'Explore seasonal and celebration-specific dishes',
    ],
  },
  {
    id: 'grimoire',
    title: 'Personal Grimoire',
    description: 'Build your mystical cookbook collection',
    icon: '📖',
    details: [
      'Save your favorite recipes for easy access',
      'Create custom recipe collections and meal plans',
      'Add personal notes and modifications',
      'Share your creations with the coven community',
    ],
  },
  {
    id: 'alchemical-transformations',
    title: 'Alchemical Transformations',
    description: 'Modify recipes to suit your needs',
    icon: '⚗️',
    details: [
      'Adapt recipes for dietary restrictions',
      'Scale ingredients for different serving sizes',
      'Substitute ingredients with magical alternatives',
      'Transform traditional recipes with modern techniques',
    ],
  },
];

const FeatureTutorial: React.FC<FeatureTutorialProps> = ({
  userName,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep.id));

    if (isLastStep) {
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
            Welcome to Your Mystical Kitchen, {userName}!
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-6"></div>
          <p className="text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Let us guide you through the magical features that await you in the
            Arcane Kitchen.
          </p>
        </div>

        {/* Tutorial Step */}
        <div className="bg-gradient-to-br from-stone-800/60 via-green-900/30 to-amber-900/30 backdrop-blur-lg border border-green-400/40 rounded-3xl p-8 md:p-12 shadow-2xl shadow-emerald-500/10">
          {/* Step indicator */}
          <div className="flex justify-center space-x-2 mb-8">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index < currentStepIndex
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                    : index === currentStepIndex
                      ? 'bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse'
                      : 'bg-stone-600/50'
                }`}
              />
            ))}
          </div>

          {/* Feature showcase */}
          <div className="max-w-2xl mx-auto">
            <div className="text-6xl mb-6">{currentStep.icon}</div>
            <h2 className="text-3xl font-bold text-stone-200 mb-4">
              {currentStep.title}
            </h2>
            <p className="text-xl text-emerald-300 mb-8 font-semibold">
              {currentStep.description}
            </p>

            {/* Feature details */}
            <div className="bg-gradient-to-r from-stone-900/30 to-stone-800/30 rounded-xl p-6 mb-8">
              <ul className="space-y-3 text-left">
                {currentStep.details.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-3 text-stone-300"
                  >
                    <span className="text-emerald-400 mt-1">✦</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                currentStepIndex === 0
                  ? 'invisible'
                  : 'bg-stone-700/50 text-stone-300 border border-stone-600/50 hover:bg-stone-600/50 hover:border-stone-500/50'
              }`}
            >
              ← Previous
            </button>

            <div className="text-sm text-stone-400">
              Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
            </div>

            <button
              onClick={handleNext}
              className="btn-primary px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300"
            >
              {isLastStep ? 'Enter the Kitchen ✨' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Completion encouragement */}
        <div className="text-sm text-stone-400/70 max-w-xl mx-auto italic pt-8">
          "Knowledge is the first ingredient in any successful magical recipe.
          Master these tools, and the kitchen's secrets shall be yours."
        </div>
      </div>
    </div>
  );
};

export default FeatureTutorial;
