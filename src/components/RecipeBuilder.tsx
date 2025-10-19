import React, { useState, useCallback } from 'react';
import { useMessages } from '../hooks/useMessages';

interface RecipeBuilderProps {
  isAuthenticated: boolean;
  currentUser: any;
  userAttributes?: any;
  onShowChat?: () => void;
}

interface RecipeForm {
  dishType: string;
  mainIngredients: string[];
  cuisineStyle: string;
  dietaryRestrictions: string[];
  difficulty: string;
  cookingTime: string;
  servings: string;
  occasion: string;
  customPrompt: string;
}

const DISH_TYPES = [
  { id: 'appetizer', name: 'Appetizer', icon: '🥗' },
  { id: 'soup', name: 'Soup & Stew', icon: '🍲' },
  { id: 'main', name: 'Main Course', icon: '🍽️' },
  { id: 'side', name: 'Side Dish', icon: '🥬' },
  { id: 'dessert', name: 'Dessert', icon: '🧁' },
  { id: 'beverage', name: 'Beverage', icon: '🍵' },
  { id: 'bread', name: 'Bread & Baking', icon: '🍞' },
  { id: 'preserve', name: 'Preserves', icon: '🫙' },
];

const CUISINE_STYLES = [
  'Traditional European',
  'Mediterranean',
  'Asian Fusion',
  'Latin American',
  'Middle Eastern',
  'African',
  'Nordic',
  'American Comfort',
  'Fusion Experimental',
];

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Low-Carb',
  'Keto',
  'Paleo',
  'Raw Food',
  'Nut-Free',
  'Soy-Free',
];

const COOKING_TIMES = [
  '15 minutes',
  '30 minutes',
  '1 hour',
  '2 hours',
  '3+ hours',
  'All day slow cook',
];

const OCCASIONS = [
  'Everyday Meal',
  'Family Dinner',
  'Date Night',
  'Party/Gathering',
  'Holiday Feast',
  'Comfort Food',
  'Healthy Living',
  'Quick & Easy',
];

const RecipeBuilder: React.FC<RecipeBuilderProps> = ({
  isAuthenticated,
  currentUser,
  userAttributes,
  onShowChat,
}) => {
  const { handleSendMessage } = useMessages();
  const [activeTab, setActiveTab] = useState<'builder' | 'inspiration'>(
    'builder'
  );
  const [recipeForm, setRecipeForm] = useState<RecipeForm>({
    dishType: '',
    mainIngredients: [],
    cuisineStyle: '',
    dietaryRestrictions: [],
    difficulty: 'intermediate',
    cookingTime: '',
    servings: '4',
    occasion: '',
    customPrompt: '',
  });
  const [generatedRecipe, setGeneratedRecipe] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateForm = (field: keyof RecipeForm, value: any) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (
    field: 'mainIngredients' | 'dietaryRestrictions',
    item: string
  ) => {
    setRecipeForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i: string) => i !== item)
        : [...prev[field], item],
    }));
  };

  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated || isGenerating) return;

    setIsGenerating(true);
    setGeneratedRecipe(null);

    // Build a contextual prompt
    let prompt = `Create a ${recipeForm.dishType || 'delicious'} recipe`;

    if (recipeForm.mainIngredients.length > 0) {
      prompt += ` featuring ${recipeForm.mainIngredients.join(', ')}`;
    }

    if (recipeForm.cuisineStyle) {
      prompt += ` in ${recipeForm.cuisineStyle} style`;
    }

    if (recipeForm.occasion) {
      prompt += ` perfect for ${recipeForm.occasion.toLowerCase()}`;
    }

    if (recipeForm.cookingTime) {
      prompt += ` that takes about ${recipeForm.cookingTime} to prepare`;
    }

    if (recipeForm.servings) {
      prompt += ` and serves ${recipeForm.servings} people`;
    }

    if (recipeForm.dietaryRestrictions.length > 0) {
      prompt += `. Make it ${recipeForm.dietaryRestrictions.join(' and ').toLowerCase()}`;
    }

    if (recipeForm.difficulty) {
      prompt += `. Difficulty level should be ${recipeForm.difficulty}`;
    }

    // Use magical specialty from user profile
    const magicalSpecialty = userAttributes?.['custom:magicalSpecialty'];
    if (magicalSpecialty) {
      const specialtyMap: Record<string, string> = {
        healing: 'with nourishing and healing properties',
        protection: 'with protective and cleansing ingredients',
        abundance: 'that brings prosperity and satisfaction',
        love: 'with romantic and heart-warming qualities',
        wisdom: 'that enhances clarity and mental focus',
        strength: 'that provides energy and vitality',
      };
      prompt += ` ${specialtyMap[magicalSpecialty] || ''}`;
    }

    if (recipeForm.customPrompt) {
      prompt += `. Additional requirements: ${recipeForm.customPrompt}`;
    }

    prompt +=
      '. Please provide a complete recipe with ingredients list, step-by-step instructions, cooking tips, and any magical/mystical touches that fit the arcane kitchen theme.';

    try {
      // Use the existing message system for AI interaction
      await handleSendMessage(prompt, isAuthenticated, currentUser);
      // Note: The actual recipe will appear in the message system
      // For now, we'll show a placeholder while the AI responds
      setGeneratedRecipe(
        'Recipe is being conjured by your kitchen assistant...'
      );
    } catch (error) {
      console.error('Recipe generation failed:', error);
      setGeneratedRecipe(
        'The mystical energies are clouded. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    recipeForm,
    userAttributes,
    isAuthenticated,
    currentUser,
    handleSendMessage,
    isGenerating,
  ]);

  const resetForm = () => {
    setRecipeForm({
      dishType: '',
      mainIngredients: [],
      cuisineStyle: '',
      dietaryRestrictions: [],
      difficulty: 'intermediate',
      cookingTime: '',
      servings: '4',
      occasion: '',
      customPrompt: '',
    });
    setGeneratedRecipe(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="recipe-builder-title text-3xl md:text-4xl lg:text-5xl font-bold text-gradient mb-4">
          Recipe Cauldron
        </h1>
        {userAttributes?.picture && userAttributes?.nickname && (
          <div className="flex items-center justify-center space-x-4 mb-4">
            <img
              src={`/images/profile-pictures/${userAttributes.picture}`}
              alt="Your Avatar"
              className="w-12 h-12 rounded-full border-2 border-emerald-400/50"
            />
            <p className="text-xl text-hearth">
              Welcome back, {userAttributes.nickname}
            </p>
          </div>
        )}
        <p className="text-stone-300">
          Craft magical recipes with the wisdom of the ancients
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="bg-stone-800/50 rounded-xl p-1 border border-stone-600/30">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-6 py-2 rounded-lg transition-all duration-300 ${
              activeTab === 'builder'
                ? 'bg-emerald-600/40 text-emerald-200 shadow-lg shadow-emerald-500/20'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Recipe Builder
          </button>
          <button
            onClick={() => setActiveTab('inspiration')}
            className={`px-6 py-2 rounded-lg transition-all duration-300 ${
              activeTab === 'inspiration'
                ? 'bg-amber-600/40 text-amber-200 shadow-lg shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Quick Inspiration
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full">
        {activeTab === 'builder' ? (
          <div className="recipe-builder-grid grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Recipe Form */}
            <div className="space-y-6">
              <div className="recipe-form-section bg-gradient-to-br from-stone-800/40 via-green-900/20 to-amber-900/20 backdrop-blur-lg border border-green-400/30 rounded-2xl p-4 md:p-6">
                <h2 className="text-2xl font-bold text-stone-200 mb-6">
                  Craft Your Recipe
                </h2>

                {/* Dish Type */}
                <div className="mb-6">
                  <label className="block text-stone-300 font-medium mb-3">
                    What are you creating?
                  </label>
                  <div className="dish-type-grid grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DISH_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => updateForm('dishType', type.id)}
                        className={`p-3 rounded-xl text-center transition-all duration-300 ${
                          recipeForm.dishType === type.id
                            ? 'bg-emerald-600/40 border-2 border-emerald-400/60'
                            : 'bg-stone-700/40 border-2 border-stone-600/30 hover:border-emerald-400/40'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs text-stone-300">
                          {type.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Ingredients */}
                <div className="mb-6">
                  <label className="block text-stone-300 font-medium mb-3">
                    Key Ingredients
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., chicken, herbs, tomatoes..."
                    className="chat-input w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const ingredient = e.currentTarget.value.trim();
                        if (!recipeForm.mainIngredients.includes(ingredient)) {
                          toggleArrayItem('mainIngredients', ingredient);
                        }
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  {recipeForm.mainIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {recipeForm.mainIngredients.map((ingredient) => (
                        <span
                          key={ingredient}
                          className="px-3 py-1 bg-emerald-400/30 text-emerald-200 rounded-full text-sm cursor-pointer hover:bg-red-400/30 hover:text-red-200 transition-colors"
                          onClick={() =>
                            toggleArrayItem('mainIngredients', ingredient)
                          }
                        >
                          {ingredient} ×
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cuisine Style */}
                <div className="mb-6">
                  <label className="block text-stone-300 font-medium mb-3">
                    Cuisine Style
                  </label>
                  <select
                    value={recipeForm.cuisineStyle}
                    onChange={(e) => updateForm('cuisineStyle', e.target.value)}
                    className="chat-input w-full"
                  >
                    <option value="">Select cuisine style...</option>
                    {CUISINE_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Options Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-stone-300 font-medium mb-2">
                      Cooking Time
                    </label>
                    <select
                      value={recipeForm.cookingTime}
                      onChange={(e) =>
                        updateForm('cookingTime', e.target.value)
                      }
                      className="chat-input w-full"
                    >
                      <option value="">Any time</option>
                      {COOKING_TIMES.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-300 font-medium mb-2">
                      Servings
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={recipeForm.servings}
                      onChange={(e) => updateForm('servings', e.target.value)}
                      className="chat-input w-full"
                    />
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div className="mb-6">
                  <label className="block text-stone-300 font-medium mb-3">
                    Dietary Considerations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((diet) => (
                      <button
                        key={diet}
                        onClick={() =>
                          toggleArrayItem('dietaryRestrictions', diet)
                        }
                        className={`px-3 py-1 rounded-full text-sm transition-all duration-300 ${
                          recipeForm.dietaryRestrictions.includes(diet)
                            ? 'bg-amber-400/30 text-amber-200'
                            : 'bg-stone-700/50 text-stone-300 hover:bg-stone-600/50'
                        }`}
                      >
                        {diet}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Notes */}
                <div className="mb-6">
                  <label className="block text-stone-300 font-medium mb-3">
                    Special Requests or Notes
                  </label>
                  <textarea
                    value={recipeForm.customPrompt}
                    onChange={(e) => updateForm('customPrompt', e.target.value)}
                    placeholder="Any special requirements, flavor preferences, or cooking methods you'd like to include..."
                    className="chat-input w-full h-20 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={handleGenerate}
                    disabled={!isAuthenticated || isGenerating}
                    className={`btn-primary flex-1 ${
                      isGenerating ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center">
                        <div className="loading-dots mr-2">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                        Conjuring Recipe...
                      </span>
                    ) : (
                      '🔮 Create Recipe'
                    )}
                  </button>
                  <button onClick={resetForm} className="btn-secondary px-6">
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Recipe Preview/Results */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-stone-800/40 via-green-900/20 to-amber-900/20 backdrop-blur-lg border border-green-400/30 rounded-2xl p-6 min-h-[400px]">
                <h2 className="text-2xl font-bold text-stone-200 mb-6">
                  Your Mystical Recipe
                </h2>

                {generatedRecipe ? (
                  <div className="prose prose-stone prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-stone-300">
                      {generatedRecipe}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-stone-400 italic py-16">
                    <div className="text-6xl mb-4">🪄</div>
                    <p>
                      Your recipe will materialize here once you cast the
                      spell...
                    </p>
                    <div className="mt-6">
                      {onShowChat && (
                        <button
                          onClick={onShowChat}
                          className="text-emerald-400 hover:text-emerald-300 underline"
                        >
                          Or chat with your Sous Chef for inspiration
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Quick Inspiration Tab */
          <div className="text-center">
            <div className="bg-gradient-to-br from-stone-800/40 via-green-900/20 to-amber-900/20 backdrop-blur-lg border border-green-400/30 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-stone-200 mb-6">
                Quick Recipe Inspiration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {OCCASIONS.map((occasion) => (
                  <button
                    key={occasion}
                    onClick={() => {
                      setActiveTab('builder');
                      updateForm('occasion', occasion);
                    }}
                    className="p-4 bg-gradient-to-br from-stone-700/40 to-stone-800/40 border-2 border-stone-600/30 rounded-xl hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300"
                  >
                    <h3 className="font-bold text-stone-200 mb-2">
                      {occasion}
                    </h3>
                    <p className="text-stone-400 text-sm">
                      Get recipes perfect for this occasion
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeBuilder;
