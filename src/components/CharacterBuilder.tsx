import React, { useState } from 'react';
import ProfilePictureSelector from './ProfilePictureSelector';

interface CharacterBuilderProps {
  userAttributes: any;
  onComplete: (characterData: CharacterData) => void;
  onSkip: () => void;
}

export interface CharacterData {
  avatar: string;
  name: string;
  cookingStyle: string;
  favoriteIngredients: string[];
  magicalSpecialty: string;
}

const COOKING_STYLES = [
  {
    id: 'traditional',
    name: 'Traditional Kitchen Witch',
    description: 'Master of ancestral recipes and time-honored techniques',
  },
  {
    id: 'experimental',
    name: 'Alchemical Innovator',
    description: 'Bold experimenter with unusual ingredient combinations',
  },
  {
    id: 'herbalist',
    name: 'Garden Herbalist',
    description: 'Expert in growing and using fresh magical herbs',
  },
  {
    id: 'comfort',
    name: 'Comfort Food Sage',
    description: 'Specializes in hearty, soul-warming recipes',
  },
  {
    id: 'global',
    name: 'Worldly Wanderer',
    description: 'Collector of recipes from distant lands and cultures',
  },
  {
    id: 'seasonal',
    name: 'Seasonal Mystic',
    description: 'Follows the natural rhythms and seasonal ingredients',
  },
];

const MAGICAL_SPECIALTIES = [
  {
    id: 'healing',
    name: 'Healing Brews',
    description: 'Soups and teas that restore body and spirit',
  },
  {
    id: 'protection',
    name: 'Protection Charms',
    description: 'Foods that ward off negative energy',
  },
  {
    id: 'abundance',
    name: 'Abundance Feasts',
    description: 'Dishes that bring prosperity and plenty',
  },
  {
    id: 'love',
    name: 'Love Potions',
    description: 'Romantic recipes that warm the heart',
  },
  {
    id: 'wisdom',
    name: 'Wisdom Elixirs',
    description: 'Brain-boosting foods for clarity and focus',
  },
  {
    id: 'strength',
    name: 'Strength Tonics',
    description: 'Energizing meals for physical vitality',
  },
];

const INGREDIENT_OPTIONS = [
  'Fresh Herbs',
  'Exotic Spices',
  'Wild Mushrooms',
  'Garden Vegetables',
  'Ancient Grains',
  'Healing Honey',
  'Sea Salt',
  'Rare Oils',
  'Fermented Foods',
  'Seasonal Fruits',
  'Aromatic Flowers',
  'Sacred Seeds',
];

const CharacterBuilder: React.FC<CharacterBuilderProps> = ({
  userAttributes,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState(1);
  const [characterData, setCharacterData] = useState<CharacterData>({
    avatar: '',
    name: userAttributes?.name || '',
    cookingStyle: '',
    favoriteIngredients: [],
    magicalSpecialty: '',
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete(characterData);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return characterData.avatar !== '';
      case 2:
        return characterData.name.trim() !== '';
      case 3:
        return characterData.cookingStyle !== '';
      case 4:
        return characterData.magicalSpecialty !== '';
      default:
        return false;
    }
  };

  const toggleIngredient = (ingredient: string) => {
    setCharacterData((prev) => ({
      ...prev,
      favoriteIngredients: prev.favoriteIngredients.includes(ingredient)
        ? prev.favoriteIngredients.filter((i) => i !== ingredient)
        : [...prev.favoriteIngredients, ingredient],
    }));
  };

  return (
    <div className="min-h-screen cottage-interior relative flex items-center justify-center character-builder-container">
      {/* Mystical background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-6 h-6 bg-emerald-400/20 rounded-full animate-mystical-float"></div>
        <div
          className="absolute top-40 right-32 w-4 h-4 bg-amber-400/20 rounded-full animate-mystical-float"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-5 h-5 bg-purple-400/20 rounded-full animate-mystical-float"
          style={{ animationDelay: '4s' }}
        ></div>
        <div
          className="absolute bottom-40 right-20 w-3 h-3 bg-emerald-400/20 rounded-full animate-mystical-float"
          style={{ animationDelay: '6s' }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="character-builder-title text-4xl md:text-6xl font-bold text-gradient mb-4">
            Build Your Kitchen Persona
          </h1>
          <p className="text-xl text-stone-300 mb-6">
            Craft your magical cooking identity to personalize your recipe
            journey
          </p>

          {/* Progress indicator */}
          <div className="flex justify-center space-x-2 mb-8">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  stepNum <= step
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                    : 'bg-stone-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="character-builder-card bg-gradient-to-br from-stone-800/40 via-green-900/20 to-amber-900/20 backdrop-blur-lg border border-green-400/30 rounded-3xl p-6 md:p-8 shadow-2xl">
          {step === 1 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-stone-200 mb-6">
                Choose Your Avatar
              </h2>
              <p className="text-stone-300 mb-8">
                Select the character that represents your kitchen magic
              </p>
              <ProfilePictureSelector
                selectedProfilePicture={characterData.avatar}
                onSelect={(avatar) =>
                  setCharacterData((prev) => ({ ...prev, avatar }))
                }
                className="max-w-2xl mx-auto"
              />
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-stone-200 mb-6">
                What shall we call you?
              </h2>
              <p className="text-stone-300 mb-8">Your magical kitchen name</p>
              <div className="max-w-md mx-auto">
                <input
                  type="text"
                  value={characterData.name}
                  onChange={(e) =>
                    setCharacterData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter your name..."
                  className="chat-input text-xl text-center"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-stone-200 mb-6 text-center">
                Your Cooking Style
              </h2>
              <p className="text-stone-300 mb-8 text-center">
                What type of kitchen magic calls to you?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {COOKING_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() =>
                      setCharacterData((prev) => ({
                        ...prev,
                        cookingStyle: style.id,
                      }))
                    }
                    className={`p-4 rounded-xl text-left transition-all duration-300 ${
                      characterData.cookingStyle === style.id
                        ? 'bg-gradient-to-br from-emerald-600/40 to-green-700/40 border-2 border-emerald-400/60 shadow-lg shadow-emerald-500/20'
                        : 'bg-gradient-to-br from-stone-700/40 to-stone-800/40 border-2 border-stone-600/30 hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/10'
                    }`}
                  >
                    <h3 className="font-bold text-stone-200 mb-2">
                      {style.name}
                    </h3>
                    <p className="text-stone-400 text-sm">
                      {style.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-stone-200 mb-6 text-center">
                Your Magical Specialty
              </h2>
              <p className="text-stone-300 mb-8 text-center">
                What kind of magical cooking resonates with your spirit?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {MAGICAL_SPECIALTIES.map((specialty) => (
                  <button
                    key={specialty.id}
                    onClick={() =>
                      setCharacterData((prev) => ({
                        ...prev,
                        magicalSpecialty: specialty.id,
                      }))
                    }
                    className={`p-4 rounded-xl text-left transition-all duration-300 ${
                      characterData.magicalSpecialty === specialty.id
                        ? 'bg-gradient-to-br from-amber-600/40 to-yellow-700/40 border-2 border-amber-400/60 shadow-lg shadow-amber-500/20'
                        : 'bg-gradient-to-br from-stone-700/40 to-stone-800/40 border-2 border-stone-600/30 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10'
                    }`}
                  >
                    <h3 className="font-bold text-stone-200 mb-2">
                      {specialty.name}
                    </h3>
                    <p className="text-stone-400 text-sm">
                      {specialty.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Optional ingredient preferences */}
              <div className="border-t border-stone-600/50 pt-6">
                <h3 className="text-lg font-bold text-stone-200 mb-4 text-center">
                  Favorite Ingredients (Optional)
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {INGREDIENT_OPTIONS.map((ingredient) => (
                    <button
                      key={ingredient}
                      onClick={() => toggleIngredient(ingredient)}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-300 ${
                        characterData.favoriteIngredients.includes(ingredient)
                          ? 'bg-emerald-400/30 text-emerald-200 border border-emerald-400/50'
                          : 'bg-stone-700/50 text-stone-300 border border-stone-600/50 hover:border-emerald-400/30'
                      }`}
                    >
                      {ingredient}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-stone-600/30">
            <div className="flex space-x-4">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="px-6 py-2 rounded-xl bg-stone-700/50 text-stone-300 border border-stone-600/50 hover:bg-stone-600/50 hover:border-stone-500/50 transition-all duration-300"
                >
                  Back
                </button>
              )}
              <button
                onClick={onSkip}
                className="px-4 py-2 text-stone-400 hover:text-stone-300 transition-colors duration-300"
              >
                Skip for now
              </button>
            </div>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`btn-primary ${
                !canProceed()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'
              }`}
            >
              {step === 4 ? 'Enter the Kitchen' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterBuilder;
