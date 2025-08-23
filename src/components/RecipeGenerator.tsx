import { useState } from 'react';
import { generateClient } from 'aws-amplify/api';

// GraphQL query for recipe generation
const generateRecipeQuery = /* GraphQL */ `
  query GenerateRecipe(
    $prompt: String!
    $ingredients: [String]
    $dietaryRestrictions: [String]
    $magicalProperties: [String]
    $difficulty: String
    $region: String
  ) {
    generateRecipe(
      prompt: $prompt
      ingredients: $ingredients
      dietaryRestrictions: $dietaryRestrictions
      magicalProperties: $magicalProperties
      difficulty: $difficulty
      region: $region
    ) {
      completion
    }
  }
`;

const client = generateClient();

export default function RecipeGenerator() {
  const [prompt, setPrompt] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [magicalProperties, setMagicalProperties] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('');
  const [region, setRegion] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError('');
    setGeneratedRecipe(null);

    try {
      // Parse ingredients from comma-separated string
      const ingredientsList = ingredients
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      // Call the GraphQL API with Nova Pro generation
      const response = await client.graphql({
        query: generateRecipeQuery,
        variables: {
          prompt,
          ingredients: ingredientsList.length > 0 ? ingredientsList : null,
          dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : null,
          magicalProperties: magicalProperties.length > 0 ? magicalProperties : null,
          difficulty: difficulty || null,
          region: region || null
        }
      });

      const completion = (response as any).data?.generateRecipe?.completion;
      setGeneratedRecipe(completion);
    } catch (error) {
      console.error('Error generating recipe:', error);
      setError('Failed to generate recipe. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDietaryChange = (restriction: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(restriction) 
        ? prev.filter(item => item !== restriction)
        : [...prev, restriction]
    );
  };

  const handleMagicalPropertyChange = (property: string) => {
    setMagicalProperties(prev => 
      prev.includes(property) 
        ? prev.filter(item => item !== property)
        : [...prev, property]
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-heading mb-2">Magical Recipe Generator</h2>
        <p className="text-arcane-text-light max-w-2xl mx-auto">
          Describe what kind of recipe you'd like, and our mystical cauldron will brew up something special for you.
        </p>
      </div>

      {!generatedRecipe ? (
        <div className="bg-white rounded-lg shadow-magical p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-arcane-text-dark text-sm mb-2">
                Describe the recipe you'd like
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., A hearty autumn stew that brings good fortune, or a refreshing summer drink that promotes clarity..."
                className="input w-full h-32"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-arcane-text-dark text-sm mb-2">
                Ingredients you'd like to include (comma separated)
              </label>
              <input
                type="text"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="E.g., mushrooms, thyme, garlic"
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-arcane-text-dark text-sm mb-2">
                  Dietary Restrictions
                </label>
                <div className="space-y-2">
                  {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'].map(restriction => (
                    <label key={restriction} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={dietaryRestrictions.includes(restriction)}
                        onChange={() => handleDietaryChange(restriction)}
                        className="mr-2"
                      />
                      <span>{restriction}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-arcane-text-dark text-sm mb-2">
                  Magical Properties
                </label>
                <div className="space-y-2">
                  {['Healing', 'Protection', 'Love', 'Prosperity', 'Clarity', 'Vitality'].map(property => (
                    <label key={property} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={magicalProperties.includes(property)}
                        onChange={() => handleMagicalPropertyChange(property)}
                        className="mr-2"
                      />
                      <span>{property}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-arcane-text-dark text-sm mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Any Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-arcane-text-dark text-sm mb-2">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Any Region</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="Asian">Asian</option>
                  <option value="Nordic">Nordic</option>
                  <option value="Middle Eastern">Middle Eastern</option>
                  <option value="Latin American">Latin American</option>
                  <option value="African">African</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary w-full ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Brewing your recipe...
                </span>
              ) : (
                'Generate Magical Recipe'
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-magical overflow-hidden">
          <div className="p-6">
            <div className="prose max-w-none">
              {/* Display the raw generated recipe */}
              <div dangerouslySetInnerHTML={{ __html: generatedRecipe.replace(/\n/g, '<br/>') }} />
            </div>
          </div>
          
          <div className="p-6 border-t border-arcane-amber-light/30 flex justify-between">
            <button 
              className="btn btn-outline"
              onClick={() => setGeneratedRecipe(null)}
            >
              Generate Another Recipe
            </button>
            
            <button className="btn btn-primary">
              Save to My Grimoire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
