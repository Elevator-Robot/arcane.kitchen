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
import { Minimize2 } from 'lucide-react';
import stockRecipePlaceholder from '../assets/stock-recipe.png';
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
  utensils: string[];
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
  utensils?: string[];
}

interface RecipeQuantity {
  amount?: string;
  unit?: string;
}

const neutralImagePlaceholder = stockRecipePlaceholder;

const EMPTY_DRAFT: RecipeDraft = {
  name: '',
  description: '',
  prepTime: '',
  tags: [],
  imageUrl: '',
  instructions: [''],
  ingredients: [{ id: 0, name: '', amount: '', unit: '' }],
  utensils: [],
};

const EXAMPLE_DRAFT: RecipeDraft = {
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
  utensils: ['Cutting board', 'Chef\'s knife', 'Mixing bowl'],
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

  const utensilParts = draft.utensils
    .map((utensil) => normalizeText(utensil))
    .filter(Boolean)
    .sort();

  return [
    normalizeText(draft.name),
    normalizeText(draft.description),
    normalizeText(draft.prepTime),
    ingredientParts.join('||'),
    instructionParts.join('||'),
    tagParts.join('||'),
    utensilParts.join('||'),
  ].join('###');
};

const isRemoteUrl = (value?: string | null) =>
  Boolean(value && /^https?:\/\//i.test(value));

const getRecipeImageSource = async (imageUrl?: string | null) => {
  if (!imageUrl) return neutralImagePlaceholder;
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
    return neutralImagePlaceholder;
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

  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_DRAFT);
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState(neutralImagePlaceholder);
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

        const isNotAuthorized = errors.some((error: any) =>
          error.message.toLowerCase().includes('not authorized')
        );

        if (!isNotAuthorized || authMode === authModes[authModes.length - 1]) {
          break;
        }
      }

      if (errors?.length) {
        const errorMessage = errors.map((error: any) => error.message).join(', ');
        if (errorMessage.toLowerCase().includes('not authorized')) {
          return;
        }

        throw new Error(errorMessage);
      }

      if (!data.length) {
        setFeedRecipes([]);
        return;
      }

      const recipes = await Promise.all(
        data
          .filter((recipe: any) => recipe.id && recipe.name)
          .map(async (recipe: any) => ({
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
            utensils: (recipe.utensils?.filter(Boolean) as string[]) ?? [],
          }))
      );

      setFeedRecipes(recipes);
    } catch (error) {
      console.error('Failed to load recipes:', error);
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
          throw new Error(errors.map((error: any) => error.message).join(', '));
        }

        const backendIds = new Set<string>(
          data
            .map((favorite: any) => favorite.recipeId)
            .filter((recipeId: any): recipeId is string => Boolean(recipeId))
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

  const addUtensil = () => {
    setDraft((previous) => ({
      ...previous,
      utensils: [...previous.utensils, ''],
    }));
  };

  const updateUtensil = (index: number, value: string) => {
    setDraft((previous) => ({
      ...previous,
      utensils: previous.utensils.map((utensil, i) =>
        i === index ? value : utensil
      ),
    }));
  };

  const removeUtensil = (index: number) => {
    setDraft((previous) => ({
      ...previous,
      utensils: previous.utensils.filter((_, i) => i !== index),
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
    setImagePreviewUrl(neutralImagePlaceholder);
    setDraft(EMPTY_DRAFT);
    setPublishMessage('');
    setPublishMessageTone('error');
    setNewTagValue('');
    setExpandedRecipeId(null);
    setCurrentView('Build');
  };

  const loadExampleRecipe = () => {
    setEditingRecipeId(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(neutralImagePlaceholder);
    setDraft(EXAMPLE_DRAFT);
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
          recipeResult.errors?.map((error: any) => error.message).join(', ') ||
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
          recipeLinksResult.errors.map((error: any) => error.message).join(', ')
        );
      }

      const ingredientDrafts = (
        await Promise.all(
          recipeLinksResult.data.map(async (link: any, index: number) => {
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
        utensils: (recipeData.utensils?.filter(Boolean) as string[]) ?? [],
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
          duplicateCheck.errors.map((error: any) => error.message).join(', ')
        );
      }

      const duplicateFingerprintMatches = duplicateCheck.data.filter(
        (recipe: any) => recipe.id !== editingRecipeId
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
          nameDuplicateCheck.errors.map((error: any) => error.message).join(', ')
        );
      }

      const duplicateNameMatches = nameDuplicateCheck.data.filter(
        (recipe: any) => recipe.id !== editingRecipeId
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
            utensils: draft.utensils
              .map((utensil) => utensil.trim())
              .filter(Boolean),
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
            updateResult.errors?.map((error: any) => error.message).join(', ') ||
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
            existingLinksResult.errors.map((error: any) => error.message).join(', ')
          );
        }

        await Promise.all(
          existingLinksResult.data.map(async (link: any) => {
            if (!link.id) return;

            const deleteLinkResult =
              await client.models.RecipeIngredient.delete(
                { id: link.id },
                { authMode: 'userPool' }
              );

            if (deleteLinkResult.errors?.length) {
              throw new Error(
                deleteLinkResult.errors.map((error: any) => error.message).join(', ')
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
            utensils: draft.utensils
              .map((utensil) => utensil.trim())
              .filter(Boolean),
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
            recipeResult.errors?.map((error: any) => error.message).join(', ') ||
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
                ?.map((error: any) => error.message)
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
              linkResult.errors.map((error: any) => error.message).join(', ')
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
        utensils: draft.utensils
          .map((utensil) => utensil.trim())
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
            result.errors.map((error: any) => error.message).join(', ')
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
            result.errors.map((error: any) => error.message).join(', ')
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
        throw new Error(errors.map((error: any) => error.message).join(', '));
      }

      const ingredientRows = await Promise.all(
        data.map(async (link: any) => {
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
        throw new Error(result.errors.map((error: any) => error.message).join(', '));
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
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--theme-bg)]">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[var(--theme-accent)]/[0.02] to-transparent" />
      <header className="sticky top-0 z-20 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <img
                src="/logo-no-background.svg"
                alt="Arcane Kitchen logo"
                draggable={false}
                className="pointer-events-none select-none h-9 w-9 object-contain"
              />
              <span className="font-heading text-lg font-semibold text-[var(--theme-text)]">
                Arcane Kitchen
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setCurrentView('Discover')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  currentView === 'Discover'
                    ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]'
                    : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                }`}
              >
                Discover
              </button>
              <button
                onClick={startCreateRecipe}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  currentView === 'Build'
                    ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]'
                    : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                }`}
              >
                Build
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {onSignOut ? (
              <button
                onClick={onSignOut}
                className="rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={onRequestAuth}
                className="rounded-lg bg-[var(--theme-accent)] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)]"
              >
                Log in
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
        <section
          id="discover"
          className={`min-h-0 overflow-y-auto ${
            currentView === 'Discover' ? 'flex flex-col' : 'hidden'
          }`}
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--theme-accent)]/5 via-[var(--theme-surface)] to-[var(--theme-sage)]/5 px-6 py-10 sm:px-10 sm:py-14">
            <div className="relative">
              <h2 className="font-heading text-4xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-5xl">
                Cook With Intention
              </h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-[var(--theme-text-muted)]">
                Discover, create, and share recipes from your cozy kitchen.
                Save your favorites, plan your meals, and cook with joy.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={startCreateRecipe}
                  className="rounded-lg bg-[var(--theme-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)]"
                >
                  Create a recipe
                </button>
                {visibleFeedRecipes.length > 0 && (
                  <span className="text-sm text-[var(--theme-text-muted)]">
                    {visibleFeedRecipes.length} recipes shared
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search + filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                value={discoverQuery}
                onChange={(event) => setDiscoverQuery(event.target.value)}
                placeholder="Search recipes..."
                className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 pl-10 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {['All', 'Favorites', 'My recipes', ...availableFilterTags].map(
              (tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    activeTag === tag
                      ? 'bg-[var(--theme-accent)] text-white'
                      : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                  }`}
                >
                  {tag}
                </button>
              )
            )}
          </div>

          {isLoadingFeed && (
            <p className="text-[var(--theme-text-muted)] mt-4 text-sm">Loading shared recipes...</p>
          )}

          {/* Recipe grid */}
          <div
            className={`mt-6 ${expandedRecipe ? '' : ''}`}
          >
            {isLoadingFeed ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]"
                  >
                    <div className="aspect-[4/3] animate-pulse bg-[var(--theme-border)]" />
                    <div className="grid gap-2.5 p-4">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--theme-bg-soft)]" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--theme-bg-soft)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : expandedRecipe ? (
              <article className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-cozy-lg">
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
                      <p className="text-[var(--theme-text-muted)] mt-1 text-sm">
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
                            ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white'
                            : 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-accent)] hover:bg-[var(--theme-bg-soft)]'
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

                  <div className="text-[var(--theme-text-muted)] flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
                        <p className="text-[var(--theme-text-muted)] mt-2 text-sm">
                          Loading ingredients...
                        </p>
                      ) : expandedRecipeMessage ? (
                        <p className="text-[var(--theme-text-muted)] mt-2 text-sm">
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

                    <section>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--theme-text)]">
                        Utensils Needed
                      </h4>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--theme-text)]">
                        {expandedRecipe.utensils?.length ? (
                          expandedRecipe.utensils.map((utensil, index) => (
                            <li key={`${expandedRecipe.id}-utensil-${index}`}>
                              {utensil}
                            </li>
                          ))
                        ) : (
                          <li>Utensils have not been added yet.</li>
                        )}
                      </ul>
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
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleFeedRecipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm transition-all hover:-translate-y-1 hover:shadow-cozy-lg"
                    onClick={() => void expandRecipe(recipe)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--theme-text)] shadow-sm backdrop-blur-sm">
                          {recipe.rating}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleFavoriteRecipe(recipe.id);
                          }}
                          disabled={pendingFavoriteRecipeIds.has(recipe.id)}
                          aria-label={`Favorite ${recipe.name}`}
                          className={`grid h-8 w-8 place-items-center rounded-full text-sm shadow-sm transition disabled:opacity-60 ${
                            favoriteRecipeIds.has(recipe.id)
                              ? 'bg-[var(--theme-accent)] text-white'
                              : 'bg-white/90 text-[var(--theme-text-muted)] backdrop-blur-sm hover:text-[var(--theme-accent)]'
                          }`}
                        >
                          {favoriteRecipeIds.has(recipe.id) ? '♥' : '♡'}
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-lg font-semibold leading-snug text-[var(--theme-text)]">
                        {recipe.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                        by {recipe.author}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--theme-text-muted)]">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {recipe.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          {recipe.saves} saves
                        </span>
                      </div>
                      {isAuthenticated && recipe.ownerId === currentUserId && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void startEditRecipe(recipe.id, recipe.ownerId);
                            }}
                            disabled={loadingEditRecipeId === recipe.id}
                            className="rounded-md border border-[var(--theme-border)] px-2.5 py-1 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)] disabled:opacity-60"
                          >
                            {loadingEditRecipeId === recipe.id
                              ? 'Opening...'
                              : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteRecipe(recipe.id, recipe.ownerId);
                            }}
                            disabled={deletingRecipeIds.has(recipe.id)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-60 ${
                              armedDeleteRecipeIds.has(recipe.id)
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-[var(--theme-text-muted)] hover:bg-red-600'
                            }`}
                          >
                            {deletingRecipeIds.has(recipe.id)
                              ? 'Deleting...'
                              : armedDeleteRecipeIds.has(recipe.id)
                                ? 'Delete permanently'
                                : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-12 rounded-xl border border-dashed border-[var(--theme-border)] p-10 text-center">
                <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                  No recipes found
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                  {isAuthenticated
                    ? 'Be the first to share a recipe with the community.'
                    : 'Log in and create the first recipe.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          id="build"
          className={`relative min-h-0 overflow-hidden rounded-xl bg-[var(--theme-surface)] ${
            currentView === 'Build'
              ? 'flex flex-col lg:col-start-1 lg:row-start-1'
              : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/50 px-5 py-4">
            <div>
              <h2 className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                {isEditingRecipe ? 'Edit recipe' : 'New recipe'}
              </h2>
              {!isEditingRecipe && (
                <button
                  type="button"
                  onClick={loadExampleRecipe}
                  className="mt-0.5 text-xs text-[var(--theme-text-muted)] underline decoration-dotted transition hover:text-[var(--theme-accent-strong)]"
                >
                  Need inspiration? Load an example
                </button>
              )}
              {!isAuthenticated && (
                <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                  Log in to publish recipes.
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
                className="rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
              >
                Cancel
              </button>
              <div className="hidden rounded-lg bg-[var(--theme-accent)]/10 px-3 py-1.5 text-sm font-medium text-[var(--theme-accent-strong)] sm:block">
                {creatorName}
              </div>
            </div>
          </div>

          <div
            className={`grid min-h-0 min-w-0 flex-1 gap-5 overflow-x-hidden overflow-y-auto p-5 ${!isAuthenticated ? 'pointer-events-none select-none opacity-45' : ''}`}
          >
            {publishMessage && (
              <div
                className={`rounded-lg border px-4 py-2.5 text-sm ${
                  publishMessageTone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {publishMessage}
              </div>
            )}

            {/* Name + Description side by side */}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Recipe name</span>
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  placeholder="e.g., Grandma's Apple Pie"
                  className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    updateDraft('description', event.target.value)
                  }
                  placeholder="A short summary of your dish"
                  className="h-[42px] resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                />
              </label>
            </div>

            {/* Prep time + Photo inline */}
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Prep time</span>
                <div>
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
                      slotProps={{ textField: { size: 'small', fullWidth: true, placeholder: 'HH:MM' } as any }}
                    />
                  </LocalizationProvider>
                </div>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Photo</span>
                <div
                  className={`flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition cursor-pointer ${
                    selectedImageFile
                      ? 'border-[var(--theme-sage)] bg-[var(--theme-sage)]/5'
                      : 'border-[var(--theme-border)] hover:border-[var(--theme-accent)]'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const input = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
                      input?.click();
                    }
                  }}
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('#recipe-photo-input');
                    input?.click();
                  }}
                >
                  <span className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${
                    selectedImageFile
                      ? 'bg-[var(--theme-sage-strong)]'
                      : 'bg-[var(--theme-text-muted)]'
                  }`}>
                    {selectedImageFile ? 'Selected' : 'Choose'}
                  </span>
                  <span className="truncate text-sm text-[var(--theme-text-muted)]">
                    {selectedImageFile ? selectedImageFile.name : 'Upload a photo'}
                  </span>
                  <input
                    id="recipe-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      updateImageFile(event.target.files?.[0])
                    }
                    className="sr-only"
                  />
                </div>
              </label>
            </div>

            {/* Tags */}
            <div className="grid gap-2">
              <span className="text-sm font-medium text-[var(--theme-text)]">Tags</span>
              <div className="flex items-center gap-2">
                <input
                  value={newTagValue}
                  onChange={(event) => setNewTagValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    addTag();
                  }}
                  placeholder="Add a tag..."
                  className="min-w-0 flex-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="shrink-0 rounded-xl border border-[var(--theme-border)] px-4 py-2.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                >
                  Add tag
                </button>
              </div>
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draft.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--theme-accent-strong)] transition hover:bg-[var(--theme-accent)]/20"
                    >
                      {tag}
                      <span aria-hidden="true" className="text-current">&times;</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ingredients + Instructions 2-col */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Ingredients */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--theme-text)]">Ingredients</h3>
                  <button
                    onClick={addIngredient}
                    className="rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                  >
                    + Add
                  </button>
                </div>
                <div className="grid gap-2">
                  {draft.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3"
                    >
                      <div className="grid gap-2">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
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
                            placeholder="e.g., All-purpose flour"
                            className="min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                          />
                          <button
                            onClick={() => removeIngredient(ingredient.id)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-sm text-[var(--theme-text-muted)] transition hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove ingredient"
                          >
                            &times;
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
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
                            placeholder="e.g., 2"
                            className="min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
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
                            placeholder="e.g., cups"
                            className="min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--theme-text)]">Instructions</h3>
                  <button
                    onClick={addInstruction}
                    className="rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                  >
                    + Add step
                  </button>
                </div>
                <div className="grid gap-2">
                  {draft.instructions.map((instruction, index) => (
                    <div
                      key={`instruction-${index}`}
                      className="flex items-start gap-2"
                    >
                      <span className="mt-2.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--theme-accent)]/10 text-xs font-semibold text-[var(--theme-accent-strong)]">
                        {index + 1}
                      </span>
                      <textarea
                        value={instruction}
                        onChange={(event) =>
                          updateInstruction(index, event.target.value)
                        }
                        placeholder="e.g., Preheat oven to 375°F"
                        className="min-h-[42px] min-w-0 flex-1 resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                      />
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm text-[var(--theme-text-muted)] transition hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Utensils */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--theme-text)]">Utensils</h3>
                <button
                  onClick={addUtensil}
                  className="rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.utensils.map((utensil, index) => (
                  <div
                    key={`utensil-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5"
                  >
                    <input
                      aria-label="Utensil"
                      value={utensil}
                      onChange={(event) =>
                        updateUtensil(index, event.target.value)
                      }
                      placeholder="e.g., Mixing bowl"
                      className="min-w-[120px] border-0 bg-transparent px-0 py-0 text-sm text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-muted)]"
                    />
                    <button
                      onClick={() => removeUtensil(index)}
                      className="grid h-6 w-6 place-items-center rounded-md text-xs text-[var(--theme-text-muted)] transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove utensil"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="absolute inset-x-4 top-28 z-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/96 p-6 text-center shadow-cozy-xl backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-accent)]">
                Account Required
              </p>
              <h3 className="mt-2 font-heading text-xl font-semibold text-[var(--theme-text)]">
                Start publishing recipes
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--theme-text-muted)]">
                Log in to add ingredients, write steps, and share recipes with the community.
              </p>
              <button
                onClick={onRequestAuth}
                className="mt-5 rounded-xl bg-[var(--theme-accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)]"
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
            className={`relative min-h-0 overflow-hidden rounded-xl bg-[var(--theme-surface)] ${
              currentView === 'Build' ? 'flex flex-col' : 'hidden'
            }`}
          >
            <div className="border-b border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/50 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-[var(--theme-text)]">
                    Preview
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">
                    {isEditingRecipe
                      ? 'Review your updates'
                      : 'Ready for the feed'}
                  </p>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={publishRecipe}
                    disabled={isPublishing}
                    className="rounded-lg bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)] disabled:opacity-60"
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
              <article className="overflow-hidden rounded-xl border border-[var(--theme-border)]">
                <img
                  src={imagePreviewUrl}
                  alt={draft.name || 'Recipe preview'}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-semibold leading-snug text-[var(--theme-text)]">
                        {draft.name || 'Untitled recipe'}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--theme-text-muted)]">by {creatorName}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[var(--theme-surface-alt)] px-2 py-1 text-xs font-semibold text-[var(--theme-text)]">
                      {rating}
                    </span>
                  </div>
                  {draft.description && (
                    <p className="mt-3 text-sm leading-relaxed text-[var(--theme-text)]">
                      {draft.description}
                    </p>
                  )}
                  {(draft.prepTime || draft.tags.length > 0) && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {draft.prepTime && (
                        <span className="rounded-full bg-[var(--theme-accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--theme-accent-strong)]">
                          {draft.prepTime}
                        </span>
                      )}
                      {draft.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--theme-sage)]/10 px-2.5 py-1 text-xs font-medium text-[var(--theme-sage-strong)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {draft.ingredients.some((ing) => ing.name) && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">Ingredients</h4>
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
                  )}
                  {draft.instructions.some(
                    (inst) => inst.trim()
                  ) && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">Instructions</h4>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--theme-text)]">
                        {draft.instructions
                          .map((instruction) => instruction.trim())
                          .filter(Boolean)
                          .map((instruction, index) => (
                            <li key={`preview-step-${index}`}>
                              {instruction}
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}
                  {draft.utensils.some((ut) => ut.trim()) && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">Utensils</h4>
                      <ul className="mt-2 space-y-1 text-sm text-[var(--theme-text)]">
                        {draft.utensils
                          .map((utensil) => utensil.trim())
                          .filter(Boolean)
                          .map((utensil, index) => (
                            <li key={`preview-utensil-${index}`}>
                              • {utensil}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            </div>
          </section>
        </aside>
      </div>
      <footer className="sticky inset-x-0 bottom-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/92 px-4 py-2.5 text-center text-xs text-[var(--theme-text-muted)] backdrop-blur-sm">
        Crafted by{' '}
        <a
          href="https://elevatorrobot.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[var(--theme-accent-strong)] hover:text-[var(--theme-accent)]"
        >
          Elevator Robot
        </a>
      </footer>
    </main>
  );
};

export default RecipeBuilder;
