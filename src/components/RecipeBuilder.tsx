import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface RecipeBuilderProps {
  isAuthenticated: boolean;
  currentUser: any;
  userAttributes?: any;
  onRequestAuth?: () => void;
  onSignOut?: () => void;
}

interface RecipeIngredientDraft {
  id: number;
  name: string;
  amount: string;
  unit: string;
}

interface RecipeDraft {
  name: string;
  description: string;
  prepTime: string;
  tags: string[];
  imageUrl: string;
  instructions: string[];
  ingredients: RecipeIngredientDraft[];
}

interface FeedRecipe {
  id: string;
  name: string;
  author: string;
  image: string;
  time: string;
  rating: string;
  saves: string;
  tags: string[];
}

const fallbackRecipes: FeedRecipe[] = [
  {
    id: 'sample-orzo',
    name: 'Charred Lemon Orzo',
    author: 'Mina Park',
    image:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80',
    time: '28 min',
    rating: '4.9',
    saves: '12.4k',
    tags: ['Weeknight', 'Vegetarian'],
  },
  {
    id: 'sample-chicken',
    name: 'Crisp Chile Honey Chicken',
    author: 'Theo Brooks',
    image:
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
    time: '45 min',
    rating: '4.8',
    saves: '9.1k',
    tags: ['Dinner', 'High Protein'],
  },
  {
    id: 'sample-pavlova',
    name: 'Market Berry Pavlova',
    author: 'Evelyn Hart',
    image:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
    time: '1 hr',
    rating: '4.7',
    saves: '6.8k',
    tags: ['Dessert', 'Seasonal'],
  },
];

const trendingTags = [
  '30-minute',
  'Dinner party',
  'Meal prep',
  'Vegetarian',
  'One pan',
  'High protein',
];

const defaultDraft: RecipeDraft = {
  name: 'Summer Tomato Toasts',
  description:
    'A bright, shareable recipe with crisp bread, marinated tomatoes, whipped ricotta, and basil oil.',
  prepTime: '20 min',
  tags: ['Seasonal', 'Vegetarian'],
  imageUrl:
    'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=900&q=80',
  ingredients: [
    { id: 1, name: 'Sourdough slices', amount: '4', unit: 'pieces' },
    { id: 2, name: 'Cherry tomatoes', amount: '2', unit: 'cups' },
    { id: 3, name: 'Ricotta', amount: '3/4', unit: 'cup' },
  ],
  instructions: [
    'Toast the sourdough until deeply golden and crisp at the edges.',
    'Toss tomatoes with olive oil, salt, pepper, and a splash of vinegar.',
    'Spread ricotta on each toast, spoon tomatoes over the top, and finish with basil oil.',
  ],
};

const getCreatorName = (userAttributes?: any, currentUser?: any) => {
  if (userAttributes?.nickname) return userAttributes.nickname;
  if (userAttributes?.email) return userAttributes.email.split('@')[0];
  if (currentUser?.username) return currentUser.username;
  return 'Guest cook';
};

const averageRating = (ratings: number[]) => {
  if (!ratings.length) return 'New';
  return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length)
    .toFixed(1)
    .replace('.0', '');
};

const getBackendRating = (ratings?: unknown[] | null) => {
  const scores =
    ratings
      ?.map((rating) => {
        if (
          rating &&
          typeof rating === 'object' &&
          'score' in rating &&
          typeof rating.score === 'number'
        ) {
          return rating.score;
        }

        if (typeof rating === 'number') return rating;
        return null;
      })
      .filter((rating): rating is number => rating !== null) ?? [];

  return averageRating(scores);
};

const RecipeBuilder: React.FC<RecipeBuilderProps> = ({
  isAuthenticated,
  currentUser,
  userAttributes,
  onRequestAuth,
  onSignOut,
}) => {
  const [draft, setDraft] = useState<RecipeDraft>(defaultDraft);
  const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>(fallbackRecipes);
  const [activeTag, setActiveTag] = useState('30-minute');
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const creatorName = getCreatorName(userAttributes, currentUser);
  const rating = useMemo(() => averageRating([5, 5, 4, 5]), []);

  const loadRecipes = useCallback(async () => {
    if (!isAuthenticated) {
      setFeedRecipes(fallbackRecipes);
      return;
    }

    setIsLoadingFeed(true);

    try {
      const { data, errors } = await client.models.Recipe.list({
        authMode: isAuthenticated ? 'userPool' : 'apiKey',
      });

      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join(', '));
      }

      if (!data.length) {
        setFeedRecipes(fallbackRecipes);
        return;
      }

      setFeedRecipes(
        data
          .filter((recipe) => recipe.id && recipe.name)
          .map((recipe) => ({
            id: recipe.id as string,
            name: recipe.name,
            author: recipe.createdBy || 'Arcane cook',
            image: recipe.imageUrl || defaultDraft.imageUrl,
            time: recipe.prepTime || 'Prep time open',
            rating: getBackendRating(recipe.ratings),
            saves: 'New',
            tags: (recipe.tags?.filter(Boolean) as string[]) ?? [],
          }))
      );
    } catch (error) {
      console.error('Failed to load recipes:', error);
      setFeedRecipes(fallbackRecipes);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const updateDraft = <K extends keyof RecipeDraft>(
    field: K,
    value: RecipeDraft[K]
  ) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  };

  const updateIngredient = (
    id: number,
    field: keyof RecipeIngredientDraft,
    value: string
  ) => {
    setDraft((previous) => ({
      ...previous,
      ingredients: previous.ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
      ),
    }));
  };

  const addIngredient = () => {
    setDraft((previous) => ({
      ...previous,
      ingredients: [
        ...previous.ingredients,
        { id: Date.now(), name: '', amount: '', unit: '' },
      ],
    }));
  };

  const removeIngredient = (id: number) => {
    setDraft((previous) => ({
      ...previous,
      ingredients: previous.ingredients.filter(
        (ingredient) => ingredient.id !== id
      ),
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setDraft((previous) => ({
      ...previous,
      instructions: previous.instructions.map((instruction, instructionIndex) =>
        instructionIndex === index ? value : instruction
      ),
    }));
  };

  const addInstruction = () => {
    setDraft((previous) => ({
      ...previous,
      instructions: [...previous.instructions, ''],
    }));
  };

  const toggleTag = (tag: string) => {
    setDraft((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag)
        ? previous.tags.filter((item) => item !== tag)
        : [...previous.tags, tag],
    }));
  };

  const publishRecipe = async () => {
    if (!isAuthenticated || isPublishing) {
      setPublishMessage('Log in to publish recipes.');
      onRequestAuth?.();
      return;
    }

    const cleanedIngredients = draft.ingredients.filter(
      (ingredient) => ingredient.name.trim() !== ''
    );

    if (!draft.name.trim() || !cleanedIngredients.length) {
      setPublishMessage('Add a recipe name and at least one ingredient.');
      return;
    }

    setIsPublishing(true);
    setPublishMessage('');

    try {
      const recipeResult = await client.models.Recipe.create({
        name: draft.name.trim(),
        description: draft.description.trim(),
        createdBy: creatorName,
        instructions: draft.instructions
          .map((instruction) => instruction.trim())
          .filter(Boolean),
        prepTime: draft.prepTime.trim(),
        tags: draft.tags,
        imageUrl: draft.imageUrl.trim(),
        ratings: [],
      }, {
        authMode: 'userPool',
      });

      if (recipeResult.errors?.length || !recipeResult.data) {
        throw new Error(
          recipeResult.errors?.map((error) => error.message).join(', ') ||
            'Recipe could not be created.'
        );
      }

      const createdRecipe = recipeResult.data;
      if (!createdRecipe.id) {
        throw new Error('Recipe was created without an id.');
      }
      const recipeId = createdRecipe.id;

      await Promise.all(
        cleanedIngredients.map(async (ingredient) => {
          const ingredientResult = await client.models.Ingredient.create({
            name: ingredient.name.trim(),
          }, {
            authMode: 'userPool',
          });

          if (ingredientResult.errors?.length || !ingredientResult.data) {
            throw new Error(
              ingredientResult.errors
                ?.map((error) => error.message)
                .join(', ') || 'Ingredient could not be created.'
            );
          }

          const createdIngredient = ingredientResult.data;
          if (!createdIngredient.id) {
            throw new Error('Ingredient was created without an id.');
          }
          const ingredientId = createdIngredient.id;

          const linkResult = await client.models.RecipeIngredient.create({
            recipeId,
            ingredientId,
            quantity: {
              amount: ingredient.amount.trim(),
              unit: ingredient.unit.trim(),
            },
          }, {
            authMode: 'userPool',
          });

          if (linkResult.errors?.length) {
            throw new Error(
              linkResult.errors.map((error) => error.message).join(', ')
            );
          }
        })
      );

      setPublishMessage('Published to the shared recipe feed.');
      await loadRecipes();
    } catch (error) {
      console.error('Failed to publish recipe:', error);
      setPublishMessage('Publish failed. Check your sandbox deployment and auth.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#201a16]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(200,79,49,0.16),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(50,95,75,0.16),transparent_34%),linear-gradient(180deg,rgba(255,250,244,0.75),rgba(247,243,236,0.92))]" />
      <header className="sticky top-0 z-20 border-b border-[#e2d8ca] bg-[#fffaf4]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#201a16] text-sm font-bold text-white">
              AK
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal">
                Arcane Kitchen
              </h1>
              <p className="text-xs text-[#74665a]">
                Explore recipes freely. Log in to create.
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full bg-white p-1 text-sm shadow-sm md:flex">
            {['Discover', 'Build', 'Saved'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={`rounded-full px-4 py-2 ${
                  item === 'Build'
                    ? 'bg-[#201a16] text-white'
                    : 'text-[#6e6258] hover:bg-[#f0e8dc]'
                }`}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="rounded-lg border border-[#d6c7b7] bg-white px-4 py-2 text-sm font-semibold text-[#51463d] shadow-sm transition hover:bg-[#f0e8dc]"
              >
                Sign out
              </button>
            )}
            <button
              onClick={isAuthenticated ? publishRecipe : onRequestAuth}
              disabled={isPublishing}
              className="rounded-lg bg-[#c84f31] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad442a] disabled:opacity-60"
            >
              {isPublishing
                ? 'Publishing...'
                : isAuthenticated
                  ? 'Publish'
                  : 'Log in to create'}
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-5 px-4 py-5 md:h-[calc(100vh-65px)] md:grid-cols-[1.05fr_1.25fr_.9fr] md:px-6">
        <section
          id="discover"
          className="min-h-0 overflow-hidden rounded-xl border border-[#e0d4c4] bg-white/88 shadow-[0_24px_70px_rgba(70,45,28,0.10)] backdrop-blur"
        >
          <div className="border-b border-[#eee5da] bg-[#fffaf4] p-4">
            <p className="text-xs font-semibold uppercase text-[#c84f31]">
              Public Feed
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              Explore what cooks are making
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#74665a]">
              Browse the community recipe stream without an account.
            </p>
            {isLoadingFeed && (
              <p className="mt-1 text-sm text-[#74665a]">
                Loading shared recipes...
              </p>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto p-4 md:max-h-[calc(100vh-170px)]">
            {feedRecipes.map((recipe) => (
              <article
                key={recipe.id}
                className="overflow-hidden rounded-xl border border-[#eee5da] bg-[#fffaf4] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="h-36 w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-normal">
                        {recipe.name}
                      </h3>
                      <p className="text-sm text-[#74665a]">
                        by {recipe.author}
                      </p>
                    </div>
                    <div className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-[#201a16] shadow-sm">
                      {recipe.rating}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#74665a]">
                    <span>{recipe.time}</span>
                    <span>{recipe.saves} saves</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white px-2.5 py-1 text-xs text-[#74665a]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="build"
          className="relative min-h-0 overflow-hidden rounded-xl border border-[#e0d4c4] bg-white/92 shadow-[0_24px_70px_rgba(70,45,28,0.12)] backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-[#eee5da] bg-white p-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[#c84f31]">
                Recipe Studio
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                Create a recipe post
              </h2>
              {!isAuthenticated && (
                <p className="mt-2 text-sm text-[#74665a]">
                  Log in to unlock publishing.
                </p>
              )}
            </div>
            <div className="hidden rounded-lg bg-[#f7f3ec] px-3 py-2 text-sm text-[#74665a] sm:block">
              Creator: {creatorName}
            </div>
          </div>

          <div className={`grid gap-4 overflow-y-auto p-4 md:max-h-[calc(100vh-170px)] ${!isAuthenticated ? 'pointer-events-none select-none opacity-45' : ''}`}>
            {publishMessage && (
              <div className="rounded-lg border border-[#e5d5c4] bg-[#fff7ed] px-3 py-2 text-sm text-[#6f4c36]">
                {publishMessage}
              </div>
            )}

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Recipe name</span>
              <input
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                className="rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 outline-none transition focus:border-[#c84f31] focus:ring-4 focus:ring-[#c84f31]/10"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  updateDraft('description', event.target.value)
                }
                className="h-20 resize-none rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 outline-none transition focus:border-[#c84f31] focus:ring-4 focus:ring-[#c84f31]/10"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Prep time</span>
                <input
                  value={draft.prepTime}
                  onChange={(event) =>
                    updateDraft('prepTime', event.target.value)
                  }
                  className="rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 outline-none transition focus:border-[#c84f31] focus:ring-4 focus:ring-[#c84f31]/10"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Image URL</span>
                <input
                  value={draft.imageUrl}
                  onChange={(event) =>
                    updateDraft('imageUrl', event.target.value)
                  }
                  className="rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 outline-none transition focus:border-[#c84f31] focus:ring-4 focus:ring-[#c84f31]/10"
                />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Ingredients</h3>
                <button
                  onClick={addIngredient}
                  className="rounded-md border border-[#d6c7b7] px-3 py-1.5 text-sm font-semibold hover:bg-[#f7f3ec]"
                >
                  Add
                </button>
              </div>
              <div className="grid gap-2">
                {draft.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="grid grid-cols-[.7fr_.9fr_1fr_auto] gap-2"
                  >
                    <input
                      aria-label="Amount"
                      value={ingredient.amount}
                      onChange={(event) =>
                        updateIngredient(
                          ingredient.id,
                          'amount',
                          event.target.value
                        )
                      }
                      className="min-w-0 rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 text-sm outline-none focus:border-[#c84f31]"
                    />
                    <input
                      aria-label="Unit"
                      value={ingredient.unit}
                      onChange={(event) =>
                        updateIngredient(
                          ingredient.id,
                          'unit',
                          event.target.value
                        )
                      }
                      className="min-w-0 rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 text-sm outline-none focus:border-[#c84f31]"
                    />
                    <input
                      aria-label="Ingredient"
                      value={ingredient.name}
                      onChange={(event) =>
                        updateIngredient(
                          ingredient.id,
                          'name',
                          event.target.value
                        )
                      }
                      className="min-w-0 rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 text-sm outline-none focus:border-[#c84f31]"
                    />
                    <button
                      onClick={() => removeIngredient(ingredient.id)}
                      className="rounded-lg border border-[#dbcdbd] px-3 text-sm text-[#74665a] hover:bg-[#f7f3ec]"
                      aria-label="Remove ingredient"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Instructions</h3>
                <button
                  onClick={addInstruction}
                  className="rounded-md border border-[#d6c7b7] px-3 py-1.5 text-sm font-semibold hover:bg-[#f7f3ec]"
                >
                  Add step
                </button>
              </div>
              <div className="grid gap-2">
                {draft.instructions.map((instruction, index) => (
                  <label
                    key={`${index}-${instruction.slice(0, 8)}`}
                    className="grid grid-cols-[2rem_1fr] items-start gap-2"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f0e8dc] text-sm font-semibold">
                      {index + 1}
                    </span>
                    <textarea
                      value={instruction}
                      onChange={(event) =>
                        updateInstruction(index, event.target.value)
                      }
                      className="h-16 resize-none rounded-lg border border-[#dbcdbd] bg-[#fffdf9] px-3 py-2 text-sm outline-none transition focus:border-[#c84f31] focus:ring-4 focus:ring-[#c84f31]/10"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="absolute inset-x-4 top-28 z-10 rounded-xl border border-[#eadfce] bg-[#fffaf4]/96 p-5 text-center shadow-2xl backdrop-blur">
              <p className="text-xs font-semibold uppercase text-[#c84f31]">
                Account Required
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-normal">
                Start publishing your own recipes
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#74665a]">
                Log in to add ingredients, write steps, and post recipes to the
                shared feed.
              </p>
              <button
                onClick={onRequestAuth}
                className="mt-4 rounded-lg bg-[#201a16] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#332922]"
              >
                Log in to create
              </button>
            </div>
          )}
        </section>

        <aside className="grid min-h-0 gap-5 md:grid-rows-[auto_1fr]">
          <section
            id="saved"
            className="rounded-xl border border-[#332922] bg-[#201a16] p-4 text-white shadow-[0_24px_70px_rgba(32,26,22,0.24)]"
          >
            <p className="text-xs font-semibold uppercase text-[#f2b49f]">
              Discovery
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">
              Trending collections
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(tag);
                    toggleTag(tag);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    activeTag === tag
                      ? 'bg-white text-[#201a16]'
                      : 'bg-white/10 text-white hover:bg-white/18'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-xl border border-[#e0d4c4] bg-white/92 shadow-[0_24px_70px_rgba(70,45,28,0.10)] backdrop-blur">
            <div className="border-b border-[#eee5da] bg-white p-4">
              <p className="text-xs font-semibold uppercase text-[#c84f31]">
                Post Preview
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">
                Ready for the feed
              </h2>
            </div>
            <div className="overflow-y-auto p-4 md:max-h-[calc(100vh-334px)]">
              <article className="overflow-hidden rounded-lg border border-[#eee5da] bg-[#fffaf4]">
                <img
                  src={draft.imageUrl}
                  alt={draft.name || 'Recipe preview'}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold tracking-normal">
                        {draft.name || 'Untitled recipe'}
                      </h3>
                      <p className="mt-1 text-sm text-[#74665a]">
                        by {creatorName}
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold shadow-sm">
                      {rating}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#51463d]">
                    {draft.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#f0e8dc] px-3 py-1 text-xs font-semibold text-[#51463d]">
                      {draft.prepTime}
                    </span>
                    {draft.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f0e8dc] px-3 py-1 text-xs font-semibold text-[#51463d]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-[#eee5da] pt-4">
                    <h4 className="text-sm font-semibold">Ingredient list</h4>
                    <ul className="mt-2 space-y-1 text-sm text-[#51463d]">
                      {draft.ingredients
                        .filter((ingredient) => ingredient.name)
                        .map((ingredient) => (
                          <li key={ingredient.id}>
                            {ingredient.amount} {ingredient.unit}{' '}
                            {ingredient.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default RecipeBuilder;
