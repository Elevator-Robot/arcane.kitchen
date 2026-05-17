import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getUrl, uploadData } from 'aws-amplify/storage';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();
const RECIPE_BUILDER_VIEW_KEY = 'arcaneKitchen.currentView';
const RECIPE_BUILDER_FAVORITES_KEY = 'arcaneKitchen.favoriteRecipeIds';
type RecipeBuilderView = 'Discover' | 'Build' | 'Saved';

const getInitialRecipeBuilderView = (): RecipeBuilderView => {
  if (typeof window === 'undefined') return 'Discover';

  const savedView = window.localStorage.getItem(RECIPE_BUILDER_VIEW_KEY);

  if (savedView === 'Discover' || savedView === 'Build' || savedView === 'Saved') {
    return savedView;
  }

  return 'Discover';
};

const getInitialFavoriteRecipeIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();

  try {
    const saved = window.localStorage.getItem(RECIPE_BUILDER_FAVORITES_KEY);
    if (!saved) return new Set();

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
};

const getCurrentUserId = (currentUser?: any, userAttributes?: any) =>
  currentUser?.userId || userAttributes?.sub || null;

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
  ownerId: string;
  name: string;
  author: string;
  description: string;
  image: string;
  time: string;
  rating: string;
  saves: string;
  tags: string[];
}

const trendingTags = [
  '30-minute',
  'Dinner party',
  'Meal prep',
  'Vegetarian',
  'One pan',
  'High protein',
];

const fallbackRecipeImage =
  'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=900&q=80';

const defaultDraft: RecipeDraft = {
  name: 'Summer Tomato Toasts',
  description:
    'A bright, shareable recipe with crisp bread, marinated tomatoes, whipped ricotta, and basil oil.',
  prepTime: '20 min',
  tags: ['Seasonal', 'Vegetarian'],
  imageUrl: '',
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

const isRemoteUrl = (value?: string | null) =>
  Boolean(value && /^https?:\/\//i.test(value));

const getRecipeImageSource = async (imageUrl?: string | null) => {
  if (!imageUrl) return fallbackRecipeImage;
  if (isRemoteUrl(imageUrl)) return imageUrl;

  try {
    const { url } = await getUrl({
      path: imageUrl,
      options: {
        expiresIn: 60 * 60,
      },
    });

    return url.toString();
  } catch (error) {
    console.error('Failed to resolve recipe image:', error);
    return fallbackRecipeImage;
  }
};

const getRecipeImagePath = (file: File) => {
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;

  return `recipe-images/${id}.${extension}`;
};

const hasStorageConfig = () =>
  Boolean((Amplify.getConfig() as { Storage?: unknown }).Storage);

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
  const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>([]);
  const [activeTag, setActiveTag] = useState('All');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [savedTag, setSavedTag] = useState('All');
  const [savedQuery, setSavedQuery] = useState('');
  const [currentView, setCurrentView] =
    useState<RecipeBuilderView>(getInitialRecipeBuilderView);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingRecipeIds, setDeletingRecipeIds] = useState<Set<string>>(() => new Set());
  const [armedDeleteRecipeIds, setArmedDeleteRecipeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [publishMessage, setPublishMessage] = useState('');
  const [feedMessage, setFeedMessage] = useState('');
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    getInitialFavoriteRecipeIds
  );
  const [pendingFavoriteRecipeIds, setPendingFavoriteRecipeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(fallbackRecipeImage);
  const creatorName = getCreatorName(userAttributes, currentUser);
  const currentUserId = getCurrentUserId(currentUser, userAttributes);
  const rating = useMemo(() => averageRating([5, 5, 4, 5]), []);

  const loadRecipes = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedMessage('');

    try {
      const { data, errors } = await client.models.Recipe.list({
        authMode: isAuthenticated ? 'userPool' : 'identityPool',
      });

      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join(', '));
      }

      if (!data.length) {
        setFeedRecipes([]);
        setFeedMessage('No recipes have been published yet.');
        return;
      }

      const recipes = await Promise.all(
        data
          .filter((recipe) => recipe.id && recipe.name)
          .map(async (recipe) => ({
            id: recipe.id as string,
            ownerId: recipe.ownerId || '',
            name: recipe.name,
            author: recipe.createdBy || 'Arcane cook',
            description: recipe.description || 'No description yet.',
            image: await getRecipeImageSource(recipe.imageUrl),
            time: recipe.prepTime || 'Prep time open',
            rating: getBackendRating(recipe.ratings),
            saves: 'New',
            tags: (recipe.tags?.filter(Boolean) as string[]) ?? [],
          }))
      );

      setFeedRecipes(recipes);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      setFeedRecipes([]);
      setFeedMessage('Recipes are unavailable right now.');
    } finally {
      setIsLoadingFeed(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RECIPE_BUILDER_VIEW_KEY, currentView);
  }, [currentView]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    const loadFavorites = async () => {
      try {
        const { data, errors } = await client.models.Favorite.list({
          filter: {
            userId: {
              eq: currentUserId,
            },
          },
          authMode: 'userPool',
        });

        if (errors?.length) {
          throw new Error(errors.map((error) => error.message).join(', '));
        }

        const backendIds = new Set(
          data
            .map((favorite) => favorite.recipeId)
            .filter((recipeId): recipeId is string => Boolean(recipeId))
        );

        if (typeof window !== 'undefined') {
          const localIds = getInitialFavoriteRecipeIds();

          for (const recipeId of localIds) {
            if (backendIds.has(recipeId)) continue;

            const favoriteId = `${currentUserId}::${recipeId}`;
            const result = await client.models.Favorite.create(
              {
                id: favoriteId,
                userId: currentUserId,
                recipeId,
              },
              { authMode: 'userPool' }
            );

            if (!result.errors?.length) {
              backendIds.add(recipeId);
            }
          }

          window.localStorage.removeItem(RECIPE_BUILDER_FAVORITES_KEY);
        }

        setFavoriteRecipeIds(backendIds);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    };

    loadFavorites();
  }, [currentUserId, isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined' || (isAuthenticated && currentUserId)) return;
    window.localStorage.setItem(
      RECIPE_BUILDER_FAVORITES_KEY,
      JSON.stringify([...favoriteRecipeIds])
    );
  }, [currentUserId, favoriteRecipeIds, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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

  const visibleFeedRecipes = useMemo(() => {
    const query = discoverQuery.trim().toLowerCase();

    return feedRecipes.filter((recipe) => {
      const matchesTag =
        activeTag === 'All'
          ? true
          : activeTag === 'My recipes'
            ? Boolean(currentUserId) && recipe.ownerId === currentUserId
            : recipe.tags.some((tag) => tag === activeTag);

      if (!query) return matchesTag;

      const haystack = [
        recipe.name,
        recipe.author,
        recipe.description,
        recipe.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return matchesTag && haystack.includes(query);
    });
  }, [activeTag, currentUserId, discoverQuery, feedRecipes]);

  const favoriteRecipes = useMemo(
    () => feedRecipes.filter((recipe) => favoriteRecipeIds.has(recipe.id)),
    [favoriteRecipeIds, feedRecipes]
  );

  const visibleFavoriteRecipes = useMemo(() => {
    const query = savedQuery.trim().toLowerCase();

    return favoriteRecipes.filter((recipe) => {
      const matchesTag =
        savedTag === 'All' || recipe.tags.some((tag) => tag === savedTag);

      if (!query) return matchesTag;

      const haystack = [
        recipe.name,
        recipe.author,
        recipe.description,
        recipe.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return matchesTag && haystack.includes(query);
    });
  }, [favoriteRecipes, savedQuery, savedTag]);

  const updateImageFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPublishMessage('Choose an image file for the recipe photo.');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setDraft((previous) => ({ ...previous, imageUrl: '' }));
    setPublishMessage('');
  };

  const publishRecipe = async () => {
    if (!isAuthenticated || !currentUserId || isPublishing) {
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

    if (selectedImageFile && !hasStorageConfig()) {
      setPublishMessage(
        'Photo uploads need the latest backend deployment. Run npm run deploy:sandbox, then restart the frontend.'
      );
      return;
    }

    setIsPublishing(true);
    setPublishMessage('');

    try {
      let imageUrl = draft.imageUrl.trim();

      if (selectedImageFile) {
        imageUrl = getRecipeImagePath(selectedImageFile);

        await uploadData({
          path: imageUrl,
          data: selectedImageFile,
          options: {
            contentType: selectedImageFile.type || 'image/jpeg',
            preventOverwrite: true,
          },
        }).result;
      }

      const recipeResult = await client.models.Recipe.create({
        name: draft.name.trim(),
        ownerId: currentUserId,
        description: draft.description.trim(),
        createdBy: creatorName,
        instructions: draft.instructions
          .map((instruction) => instruction.trim())
          .filter(Boolean),
        prepTime: draft.prepTime.trim(),
        tags: draft.tags,
        imageUrl,
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
            quantity: JSON.stringify({
              amount: ingredient.amount.trim(),
              unit: ingredient.unit.trim(),
            }),
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
      const message =
        error instanceof Error && error.message.includes('Missing bucket name')
          ? 'Photo uploads need the latest backend deployment. Run npm run deploy:sandbox, then restart the frontend.'
          : 'Publish failed. Check your sandbox deployment and auth.';

      setPublishMessage(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleFavoriteRecipe = async (recipeId: string) => {
    if (pendingFavoriteRecipeIds.has(recipeId)) return;

    if (!isAuthenticated || !currentUserId) {
      onRequestAuth?.();
      return;
    }

    const isFavorited = favoriteRecipeIds.has(recipeId);
    const favoriteId = `${currentUserId}::${recipeId}`;

    setPendingFavoriteRecipeIds((previous) => {
      const next = new Set(previous);
      next.add(recipeId);
      return next;
    });

    setFavoriteRecipeIds((previous) => {
      const next = new Set(previous);
      if (isFavorited) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });

    try {
      if (isFavorited) {
        const result = await client.models.Favorite.delete(
          { id: favoriteId },
          { authMode: 'userPool' }
        );

        if (result.errors?.length) {
          throw new Error(result.errors.map((error) => error.message).join(', '));
        }
      } else {
        const result = await client.models.Favorite.create(
          {
            id: favoriteId,
            userId: currentUserId,
            recipeId,
          },
          { authMode: 'userPool' }
        );

        if (result.errors?.length) {
          throw new Error(result.errors.map((error) => error.message).join(', '));
        }
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
      setFavoriteRecipeIds((previous) => {
        const next = new Set(previous);
        if (isFavorited) {
          next.add(recipeId);
        } else {
          next.delete(recipeId);
        }
        return next;
      });
    } finally {
      setPendingFavoriteRecipeIds((previous) => {
        const next = new Set(previous);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const deleteRecipe = async (recipeId: string, recipeOwnerId: string) => {
    if (!isAuthenticated || !currentUserId) {
      onRequestAuth?.();
      return;
    }

    if (recipeOwnerId !== currentUserId) {
      return;
    }

    if (deletingRecipeIds.has(recipeId)) return;

    if (!armedDeleteRecipeIds.has(recipeId)) {
      setArmedDeleteRecipeIds((previous) => {
        const next = new Set(previous);
        next.add(recipeId);
        return next;
      });
      return;
    }

    setDeletingRecipeIds((previous) => {
      const next = new Set(previous);
      next.add(recipeId);
      return next;
    });

    try {
      const result = await client.models.Recipe.delete(
        { id: recipeId },
        { authMode: 'userPool' }
      );

      if (result.errors?.length) {
        throw new Error(result.errors.map((error) => error.message).join(', '));
      }

      setFeedRecipes((previous) => previous.filter((recipe) => recipe.id !== recipeId));
      setFavoriteRecipeIds((previous) => {
        const next = new Set(previous);
        next.delete(recipeId);
        return next;
      });
      setArmedDeleteRecipeIds((previous) => {
        const next = new Set(previous);
        next.delete(recipeId);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    } finally {
      setDeletingRecipeIds((previous) => {
        const next = new Set(previous);
        next.delete(recipeId);
        return next;
      });
    }
  };

  return (
    <main className="ak-bg h-screen overflow-hidden">
      <div className="ak-page-glow pointer-events-none fixed inset-0" />
      <header className="ak-header sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--theme-pine-strong)] text-sm font-bold text-white">
              AK
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal">
                Arcane Kitchen
              </h1>
              <p className="ak-muted text-xs">
                Explore recipes freely. Log in to create.
              </p>
            </div>
          </div>

          <nav className="ak-pill-nav hidden items-center gap-1 rounded-full p-1 text-sm md:flex">
            {['Discover', 'Build', 'Saved'].map((item) => (
              <button
                key={item}
                onClick={() => setCurrentView(item as 'Discover' | 'Build' | 'Saved')}
                className={`rounded-full px-4 py-2 font-semibold transition-colors ${
                  item === currentView
                    ? 'bg-[var(--theme-pine)] text-white'
                    : 'text-[var(--theme-text)] hover:bg-[var(--theme-plum)] hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="ak-button-secondary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
              >
                Sign out
              </button>
            )}
            <button
              onClick={isAuthenticated ? publishRecipe : onRequestAuth}
              disabled={isPublishing}
              className="ak-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60"
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

      <div
        className={`relative mx-auto grid w-full max-w-[1800px] gap-4 px-4 py-4 lg:h-[calc(100vh-65px)] lg:px-6 ${
          currentView === 'Build'
            ? 'lg:grid-cols-[minmax(560px,1.4fr)_minmax(380px,0.9fr)]'
            : ''
        }`}
      >
        <div className="ak-pill-nav flex items-center gap-1 rounded-full p-1 text-sm md:hidden">
          {['Discover', 'Build', 'Saved'].map((item) => (
            <button
              key={item}
              onClick={() => setCurrentView(item as 'Discover' | 'Build' | 'Saved')}
              className={`rounded-full px-3 py-2 font-semibold transition-colors ${
                item === currentView
                  ? 'bg-[var(--theme-pine)] text-white'
                  : 'text-[var(--theme-text)] hover:bg-[var(--theme-plum)] hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <section
          id="discover"
          className={`ak-card min-h-0 overflow-hidden rounded-xl ${
            currentView === 'Discover' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div className="ak-surface-alt border-b p-4">
            <p className="ak-accent text-xs font-semibold uppercase">
              Public Feed
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">Browse recipes</h2>
            <p className="ak-muted mt-2 text-sm leading-6">
              Search and filter community recipes without signing in.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <input
                value={discoverQuery}
                onChange={(event) => setDiscoverQuery(event.target.value)}
                placeholder="Search by name, creator, or tag"
                className="ak-input rounded-lg px-3 py-2 text-sm outline-none"
              />
              <p className="ak-muted text-xs sm:text-right">
                {visibleFeedRecipes.length} of {feedRecipes.length} recipes
              </p>
            </div>
            {isLoadingFeed && (
              <p className="ak-muted mt-1 text-sm">
                Loading shared recipes...
              </p>
            )}
          </div>

          <div className="ak-surface border-b px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {['All', 'My recipes', ...trendingTags].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeTag === tag
                      ? 'bg-[var(--theme-plum)] text-white'
                      : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-plum-strong)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {isLoadingFeed ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="ak-surface-alt overflow-hidden rounded-xl border"
                  >
                    <div className="h-40 animate-pulse bg-[var(--theme-border)]" />
                    <div className="grid gap-3 p-3">
                      <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--theme-border)]" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--theme-bg-soft)]" />
                      <div className="flex gap-2">
                        <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--theme-bg-soft)]" />
                        <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--theme-bg-soft)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleFeedRecipes.length ? visibleFeedRecipes.map((recipe) => (
              <article
                key={recipe.id}
                className="ak-surface-alt overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="h-40 w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-normal">
                        {recipe.name}
                      </h3>
                      <p className="ak-muted text-sm">
                        by {recipe.author}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavoriteRecipe(recipe.id)}
                        disabled={pendingFavoriteRecipeIds.has(recipe.id)}
                        aria-label={`Favorite ${recipe.name}`}
                        className={`grid h-8 w-8 place-items-center rounded-full border text-sm transition disabled:opacity-60 ${
                          favoriteRecipeIds.has(recipe.id)
                            ? 'border-[var(--theme-plum)] bg-[var(--theme-plum)] text-white'
                            : 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-plum)] hover:bg-[var(--theme-bg-soft)]'
                        }`}
                      >
                        {favoriteRecipeIds.has(recipe.id) ? '♥' : '♡'}
                      </button>
                      <div className="rounded-md bg-[var(--theme-surface)] px-2 py-1 text-sm font-semibold text-[var(--theme-text)] shadow-sm">
                        {recipe.rating}
                      </div>
                    </div>
                  </div>
                  <div className="ak-muted mt-3 flex items-center justify-between text-xs">
                    <span>{recipe.time}</span>
                    <span>{recipe.saves} saves</span>
                  </div>
                  {isAuthenticated && recipe.ownerId === currentUserId && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => deleteRecipe(recipe.id, recipe.ownerId)}
                        disabled={deletingRecipeIds.has(recipe.id)}
                        className={`ak-button-danger inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-md py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-out disabled:opacity-60 ${
                          deletingRecipeIds.has(recipe.id)
                            ? 'w-28 px-2.5'
                            : armedDeleteRecipeIds.has(recipe.id)
                              ? 'w-36 px-3'
                              : 'w-28 px-3'
                        }`}
                      >
                        {deletingRecipeIds.has(recipe.id)
                          ? 'Deleting...'
                          : armedDeleteRecipeIds.has(recipe.id)
                            ? 'Delete permanently'
                            : 'Delete recipe'}
                      </button>
                    </div>
                  )}
                  <p className="mt-3 text-sm leading-6 text-[var(--theme-text)]">
                    {recipe.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="ak-button-primary rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            )) : (
              <div className="ak-surface-alt rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm font-semibold text-[var(--theme-text)]">
                  {feedMessage || 'No matching recipes right now.'}
                </p>
                <p className="ak-muted mt-2 text-sm leading-6">
                  Try another search term or switch to a different tag.
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          id="build"
          className={`ak-card relative min-h-0 overflow-hidden rounded-xl ${
            currentView === 'Build'
              ? 'flex flex-col lg:col-start-1 lg:row-start-1'
              : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <div>
              <p className="ak-accent text-xs font-semibold uppercase">
                Recipe Studio
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                Create a recipe post
              </h2>
              {!isAuthenticated && (
                <p className="ak-muted mt-2 text-sm">
                  Log in to unlock publishing.
                </p>
              )}
            </div>
            <div className="ak-button-primary hidden rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm sm:block">
              Creator: {creatorName}
            </div>
          </div>

          <div className={`grid min-h-0 min-w-0 flex-1 gap-4 overflow-x-hidden overflow-y-auto p-4 ${!isAuthenticated ? 'pointer-events-none select-none opacity-45' : ''}`}>
            {publishMessage && (
              <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] px-3 py-2 text-sm text-[var(--theme-plum-strong)]">
                {publishMessage}
              </div>
            )}

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Recipe name</span>
              <input
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                className="ak-input rounded-lg px-3 py-2 outline-none transition"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  updateDraft('description', event.target.value)
                }
                className="ak-input h-20 resize-none rounded-lg px-3 py-2 outline-none transition"
              />
            </label>

            <div className="grid min-w-0 gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Prep time</span>
                <input
                  value={draft.prepTime}
                  onChange={(event) =>
                    updateDraft('prepTime', event.target.value)
                  }
                  className="ak-input rounded-lg px-3 py-2 outline-none transition"
                />
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-semibold">Recipe photo</span>
                <span className="ak-input grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg p-2 transition">
                  <span className="rounded-md bg-[var(--theme-pine)] px-3 py-1.5 text-sm font-semibold text-white">
                    Choose photo
                  </span>
                  <span className="ak-muted min-w-0 truncate text-sm">
                    {selectedImageFile
                      ? selectedImageFile.name
                      : 'No photo selected'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      updateImageFile(event.target.files?.[0])
                    }
                    className="sr-only"
                  />
                </span>
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Ingredients</h3>
                <button
                  onClick={addIngredient}
                  className="ak-button-secondary rounded-md px-3 py-1.5 text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              <div className="grid gap-2">
                {draft.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="ak-surface-alt grid min-w-0 gap-2 rounded-xl border p-2"
                  >
                    <div className="grid min-w-0 grid-cols-[1fr_auto] gap-2">
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
                        placeholder="Ingredient"
                        className="ak-input min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                      <button
                        onClick={() => removeIngredient(ingredient.id)}
                        className="ak-button-secondary ak-muted h-10 w-10 rounded-lg text-sm font-semibold"
                        aria-label="Remove ingredient"
                      >
                        x
                      </button>
                    </div>
                    <div className="grid min-w-0 grid-cols-2 gap-2">
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
                        placeholder="Amount"
                        className="ak-input min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
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
                        placeholder="Unit"
                        className="ak-input min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Instructions</h3>
                <button
                  onClick={addInstruction}
                  className="ak-button-secondary rounded-md px-3 py-1.5 text-sm font-semibold"
                >
                  Add step
                </button>
              </div>
              <div className="grid gap-2">
                {draft.instructions.map((instruction, index) => (
                  <label
                    key={`${index}-${instruction.slice(0, 8)}`}
                    className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-start gap-2"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--theme-surface)] text-sm font-semibold text-[var(--theme-plum-strong)] ring-1 ring-[var(--theme-border)]">
                      {index + 1}
                    </span>
                    <textarea
                      value={instruction}
                      onChange={(event) =>
                        updateInstruction(index, event.target.value)
                      }
                      className="ak-input h-16 resize-none rounded-lg px-3 py-2 text-sm outline-none transition"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="absolute inset-x-4 top-28 z-10 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_96%,transparent)] p-5 text-center shadow-2xl backdrop-blur">
              <p className="ak-accent text-xs font-semibold uppercase">
                Account Required
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-normal">
                Start publishing your own recipes
              </h3>
              <p className="ak-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                Log in to add ingredients, write steps, and post recipes to the
                shared feed.
              </p>
              <button
                onClick={onRequestAuth}
                className="mt-4 rounded-lg bg-[var(--theme-pine)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-pine-strong)]"
              >
                Log in to create
              </button>
            </div>
          )}
        </section>

        <aside
          className={`min-h-0 gap-4 ${
            currentView === 'Build'
              ? 'grid lg:col-start-2 lg:row-start-1 lg:grid-rows-[minmax(0,1fr)]'
              : currentView === 'Saved'
                ? 'grid'
                : 'hidden'
          }`}
        >
          <section
            className={`ak-card min-h-0 overflow-hidden rounded-xl ${
              currentView === 'Saved' ? 'flex flex-col' : 'hidden'
            }`}
          >
            <div className="border-b border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
              <p className="ak-accent text-xs font-semibold uppercase">Favorites</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">
                Recipes you loved
              </h2>
              <p className="ak-muted mt-2 text-sm">
                {visibleFavoriteRecipes.length} of {favoriteRecipes.length} saved recipe
                {favoriteRecipes.length === 1 ? '' : 's'}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <input
                  value={savedQuery}
                  onChange={(event) => setSavedQuery(event.target.value)}
                  placeholder="Search saved recipes"
                  className="ak-input rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['All', ...trendingTags].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSavedTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      savedTag === tag
                        ? 'bg-[var(--theme-plum)] text-white'
                        : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-plum-strong)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {visibleFavoriteRecipes.length ? (
                visibleFavoriteRecipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="ak-surface-alt overflow-hidden rounded-xl border"
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
                          <p className="ak-muted text-sm">by {recipe.author}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteRecipe(recipe.id)}
                          disabled={pendingFavoriteRecipeIds.has(recipe.id)}
                          aria-label={`Remove ${recipe.name} from favorites`}
                          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--theme-plum)] bg-[var(--theme-plum)] text-sm text-white transition hover:bg-[var(--theme-plum-strong)] disabled:opacity-60"
                        >
                          ♥
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--theme-text)]">
                        {recipe.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {recipe.tags.map((tag) => (
                          <span
                            key={tag}
                            className="ak-button-primary rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="ak-surface-alt rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm font-semibold text-[var(--theme-text)]">
                    {favoriteRecipes.length
                      ? 'No saved recipes match this filter.'
                      : 'No favorites yet.'}
                  </p>
                  <p className="ak-muted mt-2 text-sm leading-6">
                    {favoriteRecipes.length
                      ? 'Try another search term or switch to a different tag.'
                      : 'Tap a heart in Discover and your saved recipes will appear here.'}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section
            className={`ak-card min-h-0 overflow-hidden rounded-xl ${
              currentView === 'Build' ? 'flex flex-col' : 'hidden'
            }`}
          >
            <div className="border-b border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
              <p className="ak-accent text-xs font-semibold uppercase">
                Post Preview
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">
                Ready for the feed
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <article className="ak-surface-alt overflow-hidden rounded-lg border">
                <img
                  src={imagePreviewUrl}
                  alt={draft.name || 'Recipe preview'}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold tracking-normal">
                        {draft.name || 'Untitled recipe'}
                      </h3>
                      <p className="ak-muted mt-1 text-sm">
                        by {creatorName}
                      </p>
                    </div>
                    <span className="rounded-md bg-[var(--theme-surface)] px-2 py-1 text-sm font-semibold shadow-sm">
                      {rating}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--theme-text)]">
                    {draft.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="ak-button-primary rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      {draft.prepTime}
                    </span>
                    {draft.tags.map((tag) => (
                      <span
                        key={tag}
                        className="ak-button-primary rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                    <h4 className="text-sm font-semibold">Ingredient list</h4>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--theme-text)]">
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
