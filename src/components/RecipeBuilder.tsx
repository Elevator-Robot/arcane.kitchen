import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getUrl, uploadData } from 'aws-amplify/storage';
import { Maximize2, Minimize2 } from 'lucide-react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import type { Schema } from '../../amplify/data/resource';
import {
  isFakeBackend,
  getFakeClient,
  fakeUploadData,
  fakeGetUrl,
} from '../fake-backend';

const client: any = isFakeBackend()
  ? getFakeClient()
  : generateClient<Schema>();
const doGetUrl = isFakeBackend() ? fakeGetUrl : getUrl;
const doUploadData = isFakeBackend() ? fakeUploadData : uploadData;
const RECIPE_BUILDER_VIEW_KEY = 'arcaneKitchen.currentView';
const RECIPE_BUILDER_FAVORITES_KEY = 'arcaneKitchen.favoriteRecipeIds';
type RecipeBuilderView = 'Discover' | 'Build';

const getInitialRecipeBuilderView = (): RecipeBuilderView => {
  if (typeof window === 'undefined' || !window.localStorage) return 'Discover';

  const savedView = window.localStorage.getItem(RECIPE_BUILDER_VIEW_KEY);

  if (savedView === 'Discover' || savedView === 'Build') {
    return savedView;
  }

  return 'Discover';
};

const getInitialFavoriteRecipeIds = (): Set<string> => {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();

  try {
    const saved = window.localStorage.getItem(RECIPE_BUILDER_FAVORITES_KEY);
    if (!saved) return new Set();

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter((value): value is string => typeof value === 'string')
    );
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
  instructions: string[];
}

interface RecipeQuantity {
  amount?: string;
  unit?: string;
}

const fallbackRecipeImage =
  'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=900&q=80';

const defaultDraft: RecipeDraft = {
  name: 'Summer Tomato Toasts',
  description:
    'A bright, shareable recipe with crisp bread, marinated tomatoes, whipped ricotta, and basil oil.',
  prepTime: '00:20',
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

const normalizeText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const buildRecipeFingerprint = (draft: RecipeDraft) => {
  const ingredientParts = draft.ingredients
    .map((ingredient) =>
      [ingredient.name, ingredient.amount, ingredient.unit]
        .map((value) => normalizeText(value))
        .join('|')
    )
    .filter((part) => part.replace(/\|/g, '').length > 0)
    .sort();

  const instructionParts = draft.instructions
    .map((instruction) => normalizeText(instruction))
    .filter(Boolean);

  const tagParts = draft.tags
    .map((tag) => normalizeText(tag))
    .filter(Boolean)
    .sort();

  return [
    normalizeText(draft.name),
    normalizeText(draft.description),
    normalizeText(draft.prepTime),
    ingredientParts.join('||'),
    instructionParts.join('||'),
    tagParts.join('||'),
  ].join('###');
};

const DEFAULT_RECIPE_FINGERPRINT = buildRecipeFingerprint(defaultDraft);

const isRemoteUrl = (value?: string | null) =>
  Boolean(value && /^https?:\/\//i.test(value));

const getRecipeImageSource = async (imageUrl?: string | null) => {
  if (!imageUrl) return fallbackRecipeImage;
  if (isRemoteUrl(imageUrl)) return imageUrl;

  try {
    const { url } = await doGetUrl({
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

const parseRecipeQuantity = (value: unknown): RecipeQuantity => {
  if (!value) return {};

  try {
    const parsed =
      typeof value === 'string' ? (JSON.parse(value) as unknown) : value;

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      return {
        amount: typeof record.amount === 'string' ? record.amount : '',
        unit: typeof record.unit === 'string' ? record.unit : '',
      };
    }
  } catch {
    return {};
  }

  return {};
};

const RecipeBuilder: React.FC<RecipeBuilderProps> = ({
  isAuthenticated,
  currentUser,
  userAttributes,
  onRequestAuth,
  onSignOut,
}) => {
  const isTabLocked = (tab: RecipeBuilderView) =>
    !isAuthenticated && tab === 'Build';

  const [draft, setDraft] = useState<RecipeDraft>(defaultDraft);
  const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>([]);
  const [activeTag, setActiveTag] = useState('All');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [currentView, setCurrentView] = useState<RecipeBuilderView>(
    getInitialRecipeBuilderView
  );
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingRecipeIds, setDeletingRecipeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [armedDeleteRecipeIds, setArmedDeleteRecipeIds] = useState<Set<string>>(
    () => new Set()
  );
  const deleteArmTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const [publishMessage, setPublishMessage] = useState('');
  const [publishMessageTone, setPublishMessageTone] = useState<
    'error' | 'success'
  >('error');
  const [feedMessage, setFeedMessage] = useState('');
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    getInitialFavoriteRecipeIds
  );
  const [pendingFavoriteRecipeIds, setPendingFavoriteRecipeIds] = useState<
    Set<string>
  >(() => new Set());
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [expandedRecipeIngredients, setExpandedRecipeIngredients] = useState<
    Record<string, string[]>
  >({});
  const [loadingExpandedRecipeId, setLoadingExpandedRecipeId] = useState<
    string | null
  >(null);
  const [expandedRecipeMessage, setExpandedRecipeMessage] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(fallbackRecipeImage);
  const [newTagValue, setNewTagValue] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [loadingEditRecipeId, setLoadingEditRecipeId] = useState<string | null>(
    null
  );
  const creatorName = getCreatorName(userAttributes, currentUser);
  const currentUserId = getCurrentUserId(currentUser, userAttributes);
  const rating = useMemo(() => averageRating([5, 5, 4, 5]), []);
  const isEditingRecipe = Boolean(editingRecipeId);

  const loadRecipes = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedMessage('');

    try {
      const authModes: Array<'userPool' | 'identityPool'> = isAuthenticated
        ? ['userPool', 'identityPool']
        : ['identityPool'];

      let data: Awaited<ReturnType<typeof client.models.Recipe.list>>['data'] =
        [];
      let errors: Awaited<
        ReturnType<typeof client.models.Recipe.list>
      >['errors'] = undefined;

      for (const authMode of authModes) {
        const result = await client.models.Recipe.list({ authMode });
        data = result.data;
        errors = result.errors;

        if (!errors?.length) break;

        const isNotAuthorized = errors.some((error) =>
          error.message.toLowerCase().includes('not authorized')
        );

        if (!isNotAuthorized || authMode === authModes[authModes.length - 1]) {
          break;
        }
      }

      if (errors?.length) {
        const errorMessage = errors.map((error) => error.message).join(', ');
        if (errorMessage.toLowerCase().includes('not authorized')) {
          setFeedMessage(
            'Recipes are unavailable until the backend auth rules are deployed.'
          );
          return;
        }

        throw new Error(errorMessage);
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
            instructions:
              (recipe.instructions?.filter(Boolean) as string[]) ?? [],
          }))
      );

      setFeedRecipes(recipes);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes('not authorized')
      ) {
        setFeedMessage(
          'Recipes are unavailable until the backend auth rules are deployed.'
        );
        return;
      }

      console.error('Failed to load recipes:', error);
      setFeedMessage('Recipes are unavailable right now.');
    } finally {
      setIsLoadingFeed(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(RECIPE_BUILDER_VIEW_KEY, currentView);
  }, [currentView]);

  useEffect(() => {
    if (!isAuthenticated && currentView === 'Build') {
      setCurrentView('Discover');
    }
  }, [currentView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setExpandedRecipeId(null);
    }
  }, [isAuthenticated]);

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

        if (typeof window !== 'undefined' && window.localStorage) {
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
    if (
      typeof window === 'undefined' ||
      !window.localStorage ||
      (isAuthenticated && currentUserId)
    ) {
      return;
    }
    window.localStorage.setItem(
      RECIPE_BUILDER_FAVORITES_KEY,
      JSON.stringify([...favoriteRecipeIds])
    );
  }, [currentUserId, favoriteRecipeIds, isAuthenticated]);

  useEffect(() => {
    return () => {
      Object.values(deleteArmTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

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
      instructions: previous.instructions.map(
        (instruction, instructionIndex) =>
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

  const addTag = () => {
    const normalizedTag = newTagValue.trim();
    if (!normalizedTag) return;

    const exists = draft.tags.some(
      (tag) => tag.toLowerCase() === normalizedTag.toLowerCase()
    );
    if (exists) {
      setNewTagValue('');
      return;
    }

    updateDraft('tags', [...draft.tags, normalizedTag]);
    setNewTagValue('');
  };

  const removeTag = (tagToRemove: string) => {
    updateDraft(
      'tags',
      draft.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const removeInstruction = (index: number) => {
    setDraft((previous) => ({
      ...previous,
      instructions: previous.instructions.filter((_, i) => i !== index),
    }));
  };

  const visibleFeedRecipes = useMemo(() => {
    const query = discoverQuery.trim().toLowerCase();

    return feedRecipes.filter((recipe) => {
      const matchesTag =
        activeTag === 'All'
          ? true
          : activeTag === 'Favorites'
            ? favoriteRecipeIds.has(recipe.id)
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
  }, [activeTag, currentUserId, discoverQuery, favoriteRecipeIds, feedRecipes]);

  const availableFilterTags = useMemo(() => {
    const uniqueTags = new Set<string>();

    for (const recipe of feedRecipes) {
      for (const tag of recipe.tags) {
        const normalizedTag = tag.trim();
        if (normalizedTag) uniqueTags.add(normalizedTag);
      }
    }

    return Array.from(uniqueTags).sort((left, right) =>
      left.localeCompare(right)
    );
  }, [feedRecipes]);

  const updateImageFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPublishMessage('Choose an image file for the recipe photo.');
      setPublishMessageTone('error');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setDraft((previous) => ({ ...previous, imageUrl: '' }));
    setPublishMessage('');
    setPublishMessageTone('error');
  };

  const startCreateRecipe = () => {
    if (isTabLocked('Build')) {
      onRequestAuth?.();
      return;
    }

    setEditingRecipeId(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(fallbackRecipeImage);
    setDraft(defaultDraft);
    setPublishMessage('');
    setPublishMessageTone('error');
    setNewTagValue('');
    setExpandedRecipeId(null);
    setCurrentView('Build');
  };

  const startEditRecipe = async (recipeId: string, recipeOwnerId: string) => {
    if (!isAuthenticated || !currentUserId) {
      onRequestAuth?.();
      return;
    }

    if (recipeOwnerId !== currentUserId) return;
    if (loadingEditRecipeId === recipeId) return;

    setLoadingEditRecipeId(recipeId);
    setPublishMessage('');
    setPublishMessageTone('error');

    try {
      const recipeResult = await client.models.Recipe.get(
        { id: recipeId },
        { authMode: 'userPool' }
      );

      if (recipeResult.errors?.length || !recipeResult.data) {
        throw new Error(
          recipeResult.errors?.map((error) => error.message).join(', ') ||
            'Recipe could not be loaded.'
        );
      }

      const recipeData = recipeResult.data;

      const recipeLinksResult = await client.models.RecipeIngredient.list({
        filter: {
          recipeId: {
            eq: recipeId,
          },
        },
        authMode: 'userPool',
      });

      if (recipeLinksResult.errors?.length) {
        throw new Error(
          recipeLinksResult.errors.map((error) => error.message).join(', ')
        );
      }

      const ingredientDrafts = (
        await Promise.all(
          recipeLinksResult.data.map(async (link, index) => {
            if (!link.ingredientId) return null;

            const ingredientResult = await client.models.Ingredient.get(
              { id: link.ingredientId },
              { authMode: 'userPool' }
            );

            if (
              ingredientResult.errors?.length ||
              !ingredientResult.data?.name
            ) {
              return null;
            }

            const quantity = parseRecipeQuantity(link.quantity);

            return {
              id: Date.now() + index,
              name: ingredientResult.data.name,
              amount: quantity.amount || '',
              unit: quantity.unit || '',
            };
          })
        )
      ).filter((ingredient): ingredient is RecipeIngredientDraft =>
        Boolean(ingredient)
      );

      const instructions =
        (recipeData.instructions?.filter(Boolean) as string[]) ?? [];
      const resolvedImage = await getRecipeImageSource(recipeData.imageUrl);

      setEditingRecipeId(recipeId);
      setSelectedImageFile(null);
      setImagePreviewUrl(resolvedImage);
      setDraft({
        name: recipeData.name || '',
        description: recipeData.description || '',
        prepTime: recipeData.prepTime || '',
        tags: (recipeData.tags?.filter(Boolean) as string[]) ?? [],
        imageUrl: recipeData.imageUrl || '',
        instructions: instructions.length ? instructions : [''],
        ingredients: ingredientDrafts.length
          ? ingredientDrafts
          : [{ id: Date.now(), name: '', amount: '', unit: '' }],
      });
      setExpandedRecipeIngredients((previous) => ({
        ...previous,
        [recipeId]: ingredientDrafts
          .map((ingredient) =>
            [
              ingredient.amount.trim(),
              ingredient.unit.trim(),
              ingredient.name.trim(),
            ]
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
          )
          .filter(Boolean),
      }));
      setNewTagValue('');
      setExpandedRecipeId(null);
      setCurrentView('Build');
    } catch (error) {
      console.error('Failed to load recipe for editing:', error);
      setPublishMessage('Could not load this recipe for editing right now.');
      setPublishMessageTone('error');
    } finally {
      setLoadingEditRecipeId((current) =>
        current === recipeId ? null : current
      );
    }
  };

  const publishRecipe = async () => {
    if (!isAuthenticated || !currentUserId || isPublishing) {
      setPublishMessage('Log in to publish recipes.');
      setPublishMessageTone('error');
      onRequestAuth?.();
      return;
    }

    const cleanedIngredients = draft.ingredients.filter(
      (ingredient) => ingredient.name.trim() !== ''
    );

    if (!draft.name.trim() || !cleanedIngredients.length) {
      setPublishMessage('Add a recipe name and at least one ingredient.');
      setPublishMessageTone('error');
      return;
    }

    const recipeFingerprint = buildRecipeFingerprint(draft);
    const recipeNameKey = normalizeText(draft.name);

    if (!isEditingRecipe && recipeFingerprint === DEFAULT_RECIPE_FINGERPRINT) {
      setPublishMessage(
        'Customize the starter recipe before publishing so the feed stays unique.'
      );
      setPublishMessageTone('error');
      return;
    }

    if (selectedImageFile && !hasStorageConfig()) {
      setPublishMessage(
        'Photo uploads need the latest backend deployment. Run npm run deploy:sandbox, then restart the frontend.'
      );
      setPublishMessageTone('error');
      return;
    }

    setIsPublishing(true);
    setPublishMessage('');
    setPublishMessageTone('error');

    try {
      const duplicateCheck = await client.models.Recipe.list({
        filter: {
          ownerId: { eq: currentUserId },
          recipeFingerprint: { eq: recipeFingerprint },
        },
        authMode: 'userPool',
      });

      if (duplicateCheck.errors?.length) {
        throw new Error(
          duplicateCheck.errors.map((error) => error.message).join(', ')
        );
      }

      const duplicateFingerprintMatches = duplicateCheck.data.filter(
        (recipe) => recipe.id !== editingRecipeId
      );

      if (duplicateFingerprintMatches.length) {
        setPublishMessage(
          'You already published this recipe. Try a new variation.'
        );
        setPublishMessageTone('error');
        return;
      }

      const nameDuplicateCheck = await client.models.Recipe.list({
        filter: {
          ownerId: { eq: currentUserId },
          recipeNameKey: { eq: recipeNameKey },
        },
        authMode: 'userPool',
      });

      if (nameDuplicateCheck.errors?.length) {
        throw new Error(
          nameDuplicateCheck.errors.map((error) => error.message).join(', ')
        );
      }

      const duplicateNameMatches = nameDuplicateCheck.data.filter(
        (recipe) => recipe.id !== editingRecipeId
      );

      if (duplicateNameMatches.length) {
        setPublishMessage(
          'You already have a recipe with this name. Rename it to publish.'
        );
        setPublishMessageTone('error');
        return;
      }

      let imageUrl = draft.imageUrl.trim();

      if (selectedImageFile) {
        imageUrl = getRecipeImagePath(selectedImageFile);

        await doUploadData({
          path: imageUrl,
          data: selectedImageFile,
          options: {
            contentType: selectedImageFile.type || 'image/jpeg',
            preventOverwrite: true,
          },
        }).result;
      }

      let recipeId = editingRecipeId;

      if (isEditingRecipe && editingRecipeId) {
        const updateResult = await client.models.Recipe.update(
          {
            id: editingRecipeId,
            name: draft.name.trim(),
            description: draft.description.trim(),
            createdBy: creatorName,
            instructions: draft.instructions
              .map((instruction) => instruction.trim())
              .filter(Boolean),
            prepTime: draft.prepTime.trim(),
            tags: draft.tags,
            imageUrl,
            recipeNameKey,
            recipeFingerprint,
          },
          {
            authMode: 'userPool',
          }
        );

        if (updateResult.errors?.length || !updateResult.data) {
          throw new Error(
            updateResult.errors?.map((error) => error.message).join(', ') ||
              'Recipe could not be updated.'
          );
        }

        const existingLinksResult = await client.models.RecipeIngredient.list({
          filter: {
            recipeId: {
              eq: editingRecipeId,
            },
          },
          authMode: 'userPool',
        });

        if (existingLinksResult.errors?.length) {
          throw new Error(
            existingLinksResult.errors.map((error) => error.message).join(', ')
          );
        }

        await Promise.all(
          existingLinksResult.data.map(async (link) => {
            if (!link.id) return;

            const deleteLinkResult =
              await client.models.RecipeIngredient.delete(
                { id: link.id },
                { authMode: 'userPool' }
              );

            if (deleteLinkResult.errors?.length) {
              throw new Error(
                deleteLinkResult.errors.map((error) => error.message).join(', ')
              );
            }
          })
        );
      } else {
        const recipeResult = await client.models.Recipe.create(
          {
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
            recipeNameKey,
            recipeFingerprint,
            ratings: [],
          },
          {
            authMode: 'userPool',
          }
        );

        if (recipeResult.errors?.length || !recipeResult.data?.id) {
          throw new Error(
            recipeResult.errors?.map((error) => error.message).join(', ') ||
              'Recipe could not be created.'
          );
        }

        recipeId = recipeResult.data.id;
      }

      if (!recipeId) {
        throw new Error('Recipe id is missing.');
      }

      await Promise.all(
        cleanedIngredients.map(async (ingredient) => {
          const ingredientResult = await client.models.Ingredient.create(
            {
              name: ingredient.name.trim(),
            },
            {
              authMode: 'userPool',
            }
          );

          if (ingredientResult.errors?.length || !ingredientResult.data?.id) {
            throw new Error(
              ingredientResult.errors
                ?.map((error) => error.message)
                .join(', ') || 'Ingredient could not be created.'
            );
          }

          const linkResult = await client.models.RecipeIngredient.create(
            {
              recipeId,
              ingredientId: ingredientResult.data.id,
              quantity: JSON.stringify({
                amount: ingredient.amount.trim(),
                unit: ingredient.unit.trim(),
              }),
            },
            {
              authMode: 'userPool',
            }
          );

          if (linkResult.errors?.length) {
            throw new Error(
              linkResult.errors.map((error) => error.message).join(', ')
            );
          }
        })
      );

      const existingRecipe = feedRecipes.find(
        (recipe) => recipe.id === recipeId
      );
      const optimisticRecipe: FeedRecipe = {
        id: recipeId,
        ownerId: currentUserId,
        name: draft.name.trim(),
        author: creatorName,
        description: draft.description.trim() || 'No description yet.',
        image: await getRecipeImageSource(imageUrl),
        time: draft.prepTime.trim() || 'Prep time open',
        rating: existingRecipe?.rating || 'New',
        saves: existingRecipe?.saves || 'New',
        tags: draft.tags,
        instructions: draft.instructions
          .map((instruction) => instruction.trim())
          .filter(Boolean),
      };

      setFeedRecipes((previous) => {
        if (isEditingRecipe) {
          return previous.map((recipe) =>
            recipe.id === recipeId ? optimisticRecipe : recipe
          );
        }

        return [
          optimisticRecipe,
          ...previous.filter((recipe) => recipe.id !== recipeId),
        ];
      });
      setExpandedRecipeIngredients((previous) => ({
        ...previous,
        [recipeId]: cleanedIngredients
          .map((ingredient) =>
            [
              ingredient.amount.trim(),
              ingredient.unit.trim(),
              ingredient.name.trim(),
            ]
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
          )
          .filter(Boolean),
      }));

      setPublishMessage(
        isEditingRecipe
          ? 'Recipe updated in the shared feed.'
          : 'Published to the shared recipe feed.'
      );
      setPublishMessageTone('success');
      setSelectedImageFile(null);
      setEditingRecipeId(null);
      await loadRecipes();
      setActiveTag('All');
      setDiscoverQuery('');
      setExpandedRecipeId(null);
      setCurrentView('Discover');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      const message =
        error instanceof Error && error.message.includes('Missing bucket name')
          ? 'Photo uploads need the latest backend deployment. Run npm run deploy:sandbox, then restart the frontend.'
          : isEditingRecipe
            ? 'Update failed. Check your sandbox deployment and auth.'
            : 'Publish failed. Check your sandbox deployment and auth.';

      setPublishMessage(message);
      setPublishMessageTone('error');
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
          throw new Error(
            result.errors.map((error) => error.message).join(', ')
          );
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
          throw new Error(
            result.errors.map((error) => error.message).join(', ')
          );
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

  const expandRecipe = async (recipe: FeedRecipe) => {
    if (!isAuthenticated) {
      onRequestAuth?.();
      return;
    }

    setExpandedRecipeId(recipe.id);
    setExpandedRecipeMessage('');

    if (expandedRecipeIngredients[recipe.id]) return;

    setLoadingExpandedRecipeId(recipe.id);

    try {
      const { data, errors } = await client.models.RecipeIngredient.list({
        filter: {
          recipeId: { eq: recipe.id },
        },
        authMode: 'userPool',
      });

      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join(', '));
      }

      const ingredientRows = await Promise.all(
        data.map(async (link) => {
          if (!link.ingredientId) return null;

          const ingredientResult = await client.models.Ingredient.get(
            { id: link.ingredientId },
            { authMode: 'userPool' }
          );

          if (ingredientResult.errors?.length || !ingredientResult.data?.name) {
            return null;
          }

          const quantity = parseRecipeQuantity(link.quantity);
          const parts = [
            quantity.amount || '',
            quantity.unit || '',
            ingredientResult.data.name,
          ]
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          return parts || ingredientResult.data.name;
        })
      );

      setExpandedRecipeIngredients((previous) => ({
        ...previous,
        [recipe.id]: ingredientRows.filter((item): item is string =>
          Boolean(item)
        ),
      }));
    } catch (error) {
      console.error('Failed to load recipe details:', error);
      setExpandedRecipeMessage('Recipe details are unavailable right now.');
      setExpandedRecipeIngredients((previous) => ({
        ...previous,
        [recipe.id]: [],
      }));
    } finally {
      setLoadingExpandedRecipeId((current) =>
        current === recipe.id ? null : current
      );
    }
  };

  const collapseExpandedRecipe = () => {
    setExpandedRecipeId(null);
    setExpandedRecipeMessage('');
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

      if (deleteArmTimeoutsRef.current[recipeId]) {
        clearTimeout(deleteArmTimeoutsRef.current[recipeId]);
      }

      deleteArmTimeoutsRef.current[recipeId] = setTimeout(() => {
        setArmedDeleteRecipeIds((previous) => {
          if (!previous.has(recipeId)) return previous;
          const next = new Set(previous);
          next.delete(recipeId);
          return next;
        });
        delete deleteArmTimeoutsRef.current[recipeId];
      }, 5000);

      return;
    }

    if (deleteArmTimeoutsRef.current[recipeId]) {
      clearTimeout(deleteArmTimeoutsRef.current[recipeId]);
      delete deleteArmTimeoutsRef.current[recipeId];
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

      setFeedRecipes((previous) =>
        previous.filter((recipe) => recipe.id !== recipeId)
      );
      setExpandedRecipeId((previous) =>
        previous === recipeId ? null : previous
      );
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
      if (deleteArmTimeoutsRef.current[recipeId]) {
        clearTimeout(deleteArmTimeoutsRef.current[recipeId]);
        delete deleteArmTimeoutsRef.current[recipeId];
      }
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

  const expandedRecipe = useMemo(
    () =>
      expandedRecipeId
        ? feedRecipes.find((recipe) => recipe.id === expandedRecipeId)
        : null,
    [expandedRecipeId, feedRecipes]
  );

  return (
    <main className="ak-bg flex h-screen flex-col overflow-hidden pb-10">
      <div className="ak-page-glow pointer-events-none fixed inset-0" />
      <header className="ak-header sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-[1800px] grid-cols-[1fr_auto_1fr] items-center px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3 justify-self-start">
            <img
              src="/logo-no-background.svg"
              alt="Arcane Kitchen logo"
              draggable={false}
              className="pointer-events-none select-none h-[4.5rem] w-[4.5rem] object-contain filter grayscale brightness-[0.18] contrast-150"
            />
            <div>
              <h1 className="text-lg font-semibold tracking-normal">
                Arcane Kitchen
              </h1>
            </div>
          </div>

          <div className="hidden md:block md:justify-self-center" />

          <div className="flex items-center gap-2 justify-self-end">
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="ak-button-secondary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
              >
                Sign out
              </button>
            )}
            {!isAuthenticated && (
              <button
                onClick={onRequestAuth}
                className="ak-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
              >
                Log in to create
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        className={`relative mx-auto grid w-full max-w-[1800px] flex-1 min-h-0 gap-4 px-4 py-4 lg:px-6 ${
          currentView === 'Build'
            ? 'lg:grid-cols-[minmax(560px,1.4fr)_minmax(380px,0.9fr)]'
            : ''
        }`}
      >
        <div className="flex items-center justify-end md:hidden">
          <button
            onClick={startCreateRecipe}
            className="ak-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
          >
            Create new
          </button>
        </div>

        <section
          id="discover"
          className={`ak-card min-h-0 overflow-hidden rounded-xl ${
            currentView === 'Discover' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div
            className={`ak-surface-alt border-b p-4 ${expandedRecipe ? 'hidden' : ''}`}
          >
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              Discover recipes
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <input
                value={discoverQuery}
                onChange={(event) => setDiscoverQuery(event.target.value)}
                placeholder="Search by name, creator, or tag"
                className="ak-input rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={startCreateRecipe}
                className="ak-button-secondary rounded-lg px-3 py-2 text-sm font-semibold"
              >
                Create new
              </button>
              <p className="ak-muted text-xs sm:text-right">
                {visibleFeedRecipes.length} of {feedRecipes.length} recipes
              </p>
            </div>
            {isLoadingFeed && (
              <p className="ak-muted mt-1 text-sm">Loading shared recipes...</p>
            )}
          </div>

          <div
            className={`ak-surface border-b px-4 py-3 ${expandedRecipe ? 'hidden' : ''}`}
          >
            <div className="flex flex-wrap gap-2">
              {['All', 'Favorites', 'My recipes', ...availableFilterTags].map(
                (tag) => (
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
                )
              )}
            </div>
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto ${expandedRecipe ? 'p-0' : 'p-4'}`}
          >
            {isLoadingFeed ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            ) : expandedRecipe ? (
              <article className="ak-surface-alt overflow-hidden rounded-xl border shadow-lg">
                <div className="relative">
                  <img
                    src={expandedRecipe.image}
                    alt={expandedRecipe.name}
                    className="h-64 w-full object-cover sm:h-80"
                  />
                  <button
                    type="button"
                    onClick={collapseExpandedRecipe}
                    aria-label="Shrink recipe"
                    title="Shrink recipe"
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md bg-black/70 text-white transition hover:bg-black"
                  >
                    <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid gap-5 p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-normal">
                        {expandedRecipe.name}
                      </h3>
                      <p className="ak-muted mt-1 text-sm">
                        by {expandedRecipe.author}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavoriteRecipe(expandedRecipe.id)}
                        disabled={pendingFavoriteRecipeIds.has(
                          expandedRecipe.id
                        )}
                        aria-label={`Favorite ${expandedRecipe.name}`}
                        className={`grid h-9 w-9 place-items-center rounded-full border text-sm transition disabled:opacity-60 ${
                          favoriteRecipeIds.has(expandedRecipe.id)
                            ? 'border-[var(--theme-plum)] bg-[var(--theme-plum)] text-white'
                            : 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-plum)] hover:bg-[var(--theme-bg-soft)]'
                        }`}
                      >
                        {favoriteRecipeIds.has(expandedRecipe.id) ? '♥' : '♡'}
                      </button>
                      <div className="rounded-md bg-[var(--theme-surface)] px-2.5 py-1 text-sm font-semibold text-[var(--theme-text)] shadow-sm">
                        {expandedRecipe.rating}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-[var(--theme-text)]">
                    {expandedRecipe.description}
                  </p>

                  <div className="ak-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span>{expandedRecipe.time}</span>
                    <span>{expandedRecipe.saves} saves</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {expandedRecipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="ak-button-primary rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <section>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--theme-text)]">
                        Ingredients
                      </h4>
                      {loadingExpandedRecipeId === expandedRecipe.id ? (
                        <p className="ak-muted mt-2 text-sm">
                          Loading ingredients...
                        </p>
                      ) : expandedRecipeMessage ? (
                        <p className="ak-muted mt-2 text-sm">
                          {expandedRecipeMessage}
                        </p>
                      ) : (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--theme-text)]">
                          {(
                            expandedRecipeIngredients[expandedRecipe.id] || []
                          ).map((ingredient) => (
                            <li key={ingredient}>{ingredient}</li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--theme-text)]">
                        Instructions
                      </h4>
                      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--theme-text)]">
                        {expandedRecipe.instructions.length ? (
                          expandedRecipe.instructions.map(
                            (instruction, index) => (
                              <li key={`${expandedRecipe.id}-step-${index}`}>
                                {instruction}
                              </li>
                            )
                          )
                        ) : (
                          <li>Instructions have not been added yet.</li>
                        )}
                      </ol>
                    </section>
                  </div>

                  {isAuthenticated &&
                    expandedRecipe.ownerId === currentUserId && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void startEditRecipe(
                              expandedRecipe.id,
                              expandedRecipe.ownerId
                            )
                          }
                          disabled={loadingEditRecipeId === expandedRecipe.id}
                          className="ak-button-secondary inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-60"
                        >
                          {loadingEditRecipeId === expandedRecipe.id
                            ? 'Opening...'
                            : 'Edit recipe'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            deleteRecipe(
                              expandedRecipe.id,
                              expandedRecipe.ownerId
                            )
                          }
                          disabled={deletingRecipeIds.has(expandedRecipe.id)}
                          className={`ak-button-danger inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-md py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-out disabled:opacity-60 ${
                            deletingRecipeIds.has(expandedRecipe.id)
                              ? 'w-28 px-2.5'
                              : armedDeleteRecipeIds.has(expandedRecipe.id)
                                ? 'w-36 px-3'
                                : 'w-28 px-3'
                          }`}
                        >
                          {deletingRecipeIds.has(expandedRecipe.id)
                            ? 'Deleting...'
                            : armedDeleteRecipeIds.has(expandedRecipe.id)
                              ? 'Delete permanently'
                              : 'Delete recipe'}
                        </button>
                      </div>
                    )}
                </div>
              </article>
            ) : visibleFeedRecipes.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleFeedRecipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="ak-surface-alt overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative">
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void expandRecipe(recipe);
                        }}
                        aria-label="Expand recipe"
                        title="Expand recipe"
                        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-black/70 text-white transition hover:bg-black"
                      >
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold tracking-normal">
                            {recipe.name}
                          </h3>
                          <p className="ak-muted text-sm">by {recipe.author}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleFavoriteRecipe(recipe.id);
                            }}
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void startEditRecipe(recipe.id, recipe.ownerId);
                            }}
                            disabled={loadingEditRecipeId === recipe.id}
                            className="ak-button-secondary inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-60"
                          >
                            {loadingEditRecipeId === recipe.id
                              ? 'Opening...'
                              : 'Edit recipe'}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteRecipe(recipe.id, recipe.ownerId);
                            }}
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
                ))}
              </div>
            ) : (
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
          <div className="flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-surface-alt)] p-4">
            <div>
              <p className="ak-accent text-xs font-semibold uppercase">
                Recipe Studio
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                {isEditingRecipe ? 'Edit your recipe' : 'Create a recipe post'}
              </h2>
              {!isAuthenticated && (
                <p className="ak-muted mt-2 text-sm">
                  Log in to unlock publishing.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingRecipeId(null);
                  setPublishMessage('');
                  setPublishMessageTone('error');
                  setCurrentView('Discover');
                }}
                className="ak-button-secondary rounded-lg px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <div className="ak-button-primary hidden rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm sm:block">
                Creator: {creatorName}
              </div>
            </div>
          </div>

          <div
            className={`grid min-h-0 min-w-0 flex-1 gap-4 overflow-x-hidden overflow-y-auto p-4 ${!isAuthenticated ? 'pointer-events-none select-none opacity-45' : ''}`}
          >
            {publishMessage && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  publishMessageTone === 'error'
                    ? 'border-[#e5b3b3] bg-[#fff1f1] text-[#8f1d1d]'
                    : 'border-[#b7d9c8] bg-[#edf9f2] text-[#1f6b42]'
                }`}
              >
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

            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(170px,0.5fr)_minmax(0,1fr)] md:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Prep time</span>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <MobileTimePicker
                    ampm={false}
                    minutesStep={5}
                    value={
                      draft.prepTime
                        ? dayjs(`2000-01-01T${draft.prepTime}`)
                        : null
                    }
                    onChange={(value) =>
                      updateDraft(
                        'prepTime',
                        value ? value.format('HH:mm') : ''
                      )
                    }
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-semibold">Recipe photo</span>
                <span
                  className={`ak-input group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg p-2 transition cursor-pointer ${
                    selectedImageFile
                      ? 'border-[var(--theme-pine)] bg-[color-mix(in_srgb,var(--theme-surface)_84%,var(--theme-pine)_16%)]'
                      : ''
                  }`}
                >
                  <span
                    className={`rounded-md bg-[var(--theme-pine)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 group-hover:brightness-110 group-active:scale-[0.98] group-focus-within:ring-2 group-focus-within:ring-[var(--theme-focus)] ${
                      selectedImageFile
                        ? 'bg-[var(--theme-pine-strong)] ring-2 ring-[var(--theme-focus)]'
                        : ''
                    }`}
                  >
                    {selectedImageFile ? 'Photo selected' : 'Choose photo'}
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

            <div className="grid gap-2">
              <span className="text-sm font-semibold">Tags</span>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={newTagValue}
                  onChange={(event) => setNewTagValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    addTag();
                  }}
                  placeholder="Add a tag"
                  className="ak-input rounded-lg px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="ak-button-secondary rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Add tag
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-plum)] px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    aria-label={`Remove tag ${tag}`}
                    title={`Remove ${tag}`}
                  >
                    {tag}
                    <span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
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
                    key={`instruction-${index}`}
                    className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2"
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
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="ak-button-secondary ak-muted h-9 w-9 rounded-lg text-sm font-semibold"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      x
                    </button>
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
              : 'hidden'
          }`}
        >
          <section
            className={`ak-card min-h-0 overflow-hidden rounded-xl ${
              currentView === 'Build' ? 'flex flex-col' : 'hidden'
            }`}
          >
            <div className="border-b border-[var(--theme-border)] bg-[var(--theme-surface-alt)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ak-accent text-xs font-semibold uppercase">
                    Post Preview
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-normal">
                    {isEditingRecipe
                      ? 'Review your updates'
                      : 'Ready for the feed'}
                  </h2>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={publishRecipe}
                    disabled={isPublishing}
                    className="ak-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                  >
                    {isPublishing
                      ? isEditingRecipe
                        ? 'Saving...'
                        : 'Publishing...'
                      : isEditingRecipe
                        ? 'Save changes'
                        : 'Publish'}
                  </button>
                )}
              </div>
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
                      <p className="ak-muted mt-1 text-sm">by {creatorName}</p>
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
                  <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                    <h4 className="text-sm font-semibold">Instructions</h4>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--theme-text)]">
                      {draft.instructions
                        .map((instruction) => instruction.trim())
                        .filter(Boolean)
                        .map((instruction, index) => (
                          <li key={`preview-step-${index}`}>{instruction}</li>
                        ))}
                    </ol>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </aside>
      </div>
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface-alt)_92%,transparent)] px-4 py-2 text-center text-xs text-[var(--theme-text-muted)] backdrop-blur-sm">
        Crafted by{' '}
        <a
          href="https://elevatorrobot.com"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[var(--theme-plum-strong)] hover:text-[var(--theme-plum)]"
        >
          Elevator Robot
        </a>
      </footer>
    </main>
  );
};

export default RecipeBuilder;
