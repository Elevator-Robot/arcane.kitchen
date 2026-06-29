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
type RecipeBuilderView = 'Discover' | 'Build' | 'Profile';

const getInitialRecipeBuilderView = (): RecipeBuilderView => {
  if (typeof window === 'undefined' || !window.localStorage) return 'Discover';

  const savedView = window.localStorage.getItem(RECIPE_BUILDER_VIEW_KEY);

  if (savedView === 'Discover' || savedView === 'Build' || savedView === 'Profile') {
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
  notes?: string;
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
  notes?: string;
  image: string;
  time: string;
  rating: string;
  saves: string;
  tags: string[];
  instructions: string[];
  utensils?: string[];
  createdAt?: string;
}

interface RecipeQuantity {
  amount?: string;
  unit?: string;
}

const IMAGE_PLACEHOLDER = '__no_image__';
const neutralImagePlaceholder = IMAGE_PLACEHOLDER;
const isPlaceholder = (src: string) => src === IMAGE_PLACEHOLDER || src === neutralImagePlaceholder;

const isRecipeNew = (recipe: FeedRecipe) => {
  if (!recipe.createdAt) return false;
  const createdAt = dayjs(recipe.createdAt);
  return createdAt.isValid() && dayjs().diff(createdAt, 'day') < 30;
};

const EMPTY_DRAFT: RecipeDraft = {
  name: '',
  description: '',
  notes: '',
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

const normalizeTag = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const TAG_CATEGORIES: Record<string, string[]> = {
  Diet: [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto',
    'Paleo', 'Low-Carb', 'Nut-Free', 'Whole30', 'Sugar-Free',
  ],
  'Meal Type': [
    'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack',
    'Appetizer', 'Brunch', 'Side',
  ],
  Cuisine: [
    'Italian', 'Mexican', 'Thai', 'Japanese', 'Indian',
    'Mediterranean', 'Chinese', 'French', 'American', 'Korean',
    'Middle Eastern', 'Vietnamese',
  ],
  Season: ['Spring', 'Summer', 'Fall', 'Winter'],
  Difficulty: ['Easy', 'Medium', 'Hard'],
};

const officialTagSet = new Set(
  Object.values(TAG_CATEGORIES).flat()
);

const tagCategoryMap = new Map<string, string>();
for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
  for (const tag of tags) {
    tagCategoryMap.set(tag.toLowerCase(), category);
  }
}

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
  const [showAllTags, setShowAllTags] = useState('');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [shuffledAvatars, setShuffledAvatars] = useState<Array<{ file: string; url: string }>>([]);
  const profileNameRef = useRef<HTMLInputElement>(null);
  const profileBioRef = useRef<HTMLTextAreaElement>(null);
  const [newTagValue, setNewTagValue] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [loadingEditRecipeId, setLoadingEditRecipeId] = useState<string | null>(
    null
  );
  const creatorName = getCreatorName(userAttributes, currentUser);
  const currentUserId = getCurrentUserId(currentUser, userAttributes);

  const PROFILE_DATA_KEY = currentUserId
    ? `arcaneKitchen.profileData.${currentUserId}`
    : null;

  const loadProfileData = useCallback(() => {
    if (!PROFILE_DATA_KEY) return { displayName: creatorName, bio: '', avatar: null };
    try {
      const saved = localStorage.getItem(PROFILE_DATA_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return { displayName: data.displayName || creatorName, bio: data.bio || '', avatar: data.avatar || null };
      }
    } catch { /* ignore */ }
    return { displayName: creatorName, bio: '', avatar: null };
  }, [PROFILE_DATA_KEY, creatorName]);

  const avatarEntries = useMemo(
    () => Object.entries(import.meta.glob<{ default: string }>('/src/assets/avatars/*.png', { eager: true })).map(([path, mod]) => ({
      file: path.split('/').pop()!,
      url: mod.default,
    })),
    [],
  );

  const savedProfileData = loadProfileData();

  const avatarUrl = savedProfileData.avatar
    ? avatarEntries.find((e) => e.file === savedProfileData.avatar)?.url || null
    : null;

  const shuffleAvatars = useCallback(() => {
    const copy = [...avatarEntries];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setShuffledAvatars(copy.slice(0, 6));
  }, [avatarEntries]);

  useEffect(() => {
    if (currentView === 'Profile') {
      setSelectedAvatar(savedProfileData.avatar);
      shuffleAvatars();
    }
  }, [currentView]);

  const saveProfile = () => {
    if (PROFILE_DATA_KEY) {
      const displayName = profileNameRef.current?.value || '';
      const bio = profileBioRef.current?.value || '';
      localStorage.setItem(PROFILE_DATA_KEY, JSON.stringify({ displayName, bio, avatar: selectedAvatar }));
    }
    setCurrentView('Discover');
  };

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
            createdAt: recipe.createdAt ? String(recipe.createdAt) : undefined,
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
    const normalizedTag = normalizeTag(newTagValue);
    if (!normalizedTag) return;
    if (draft.tags.length >= 10) return;

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
      draft.tags.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase())
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

    const filtered = feedRecipes.filter((recipe) => {
      const matchesTag =
        activeTag === 'All'
          ? true
          : activeTag === 'Favorites'
            ? favoriteRecipeIds.has(recipe.id)
            : activeTag === 'My recipes'
              ? Boolean(currentUserId) && recipe.ownerId === currentUserId
              : recipe.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase());

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

    return [...filtered].sort((left, right) => {
      const leftTime = left.createdAt ? dayjs(left.createdAt).valueOf() : 0;
      const rightTime = right.createdAt ? dayjs(right.createdAt).valueOf() : 0;
      if (sortOrder === 'desc') {
        return rightTime - leftTime;
      }
      return leftTime - rightTime;
    });
  }, [activeTag, currentUserId, discoverQuery, favoriteRecipeIds, feedRecipes, sortOrder]);

  const availableFilterTags = useMemo(() => {
    const tagMap = new Map<string, { label: string; count: number }>();

    for (const recipe of feedRecipes) {
      for (const tag of recipe.tags) {
        const normalized = normalizeTag(tag);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        const existing = tagMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          tagMap.set(key, { label: normalized, count: 1 });
        }
      }
    }

    return Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count);
  }, [feedRecipes]);

  const officialFilterTags = useMemo(() => {
    const result: { category: string; tags: { label: string; count: number }[] }[] = [];
    const tagByLabel = new Map(availableFilterTags.map((t) => [t.label.toLowerCase(), t]));

    for (const [category, labels] of Object.entries(TAG_CATEGORIES)) {
      const found: { label: string; count: number }[] = [];
      for (const label of labels) {
        const match = tagByLabel.get(label.toLowerCase());
        if (match) found.push(match);
      }
      if (found.length > 0) {
        result.push({ category, tags: found });
      }
    }
    return result;
  }, [availableFilterTags]);

  const communityFilterTags = useMemo(() => {
    return availableFilterTags.filter((t) => !officialTagSet.has(t.label));
  }, [availableFilterTags]);

  const allExistingTags = useMemo(() => {
    const tags = new Set<string>();
    for (const recipe of feedRecipes) {
      for (const tag of recipe.tags) {
        const normalized = normalizeTag(tag);
        if (normalized) tags.add(normalized);
      }
    }
    return Array.from(tags).sort();
  }, [feedRecipes]);

  const tagSuggestions = useMemo(() => {
    const query = newTagValue.trim().toLowerCase();
    if (!query || draft.tags.length >= 10) return [];
    return allExistingTags.filter(
      (tag) =>
        tag.toLowerCase().includes(query) &&
        !draft.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    ).slice(0, 8);
  }, [newTagValue, allExistingTags, draft.tags]);

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
        notes: recipeData.notes || '',
        prepTime: recipeData.prepTime || '',
        tags: (recipeData.tags?.filter(Boolean) as string[])?.map(normalizeTag) ?? [],
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

    if (isPlaceholder(imagePreviewUrl)) {
      setPublishMessage('Add a photo of the recipe.');
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
            notes: draft.notes?.trim() || undefined,
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
            notes: draft.notes?.trim() || undefined,
            createdBy: creatorName,
            createdAt: new Date().toISOString(),
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
            <div className="flex items-start gap-3">
              <img
                src="/logo-no-background.svg"
                alt="Arcane Kitchen logo"
                draggable={false}
                className="pointer-events-none select-none h-12 w-12 object-contain brightness-[0.3]"
              />
              <span className="font-heading mt-0.5 text-lg font-semibold text-[var(--theme-text)] select-none">
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
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((p) => !p)}
                  className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[var(--theme-surface-alt)]"
                >
                  <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-accent)] text-xs font-semibold text-white">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      creatorName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="max-w-[100px] truncate text-sm font-medium text-[var(--theme-text)]">
                    {savedProfileData.displayName}
                  </span>
                  <svg className={`h-4 w-4 text-[var(--theme-text-muted)] transition ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-lg">
                      <button
                        onClick={() => { setCurrentView('Profile'); setShowUserMenu(false); }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                      >
                        <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Profile
                      </button>
                      <div className="my-1 border-t border-[var(--theme-border)]" />
                      <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]">
                        <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501 1.07 1.605 2.578 2.868 4.355 3.577-1.77.71-3.278 1.972-4.347 3.577a1.067 1.067 0 01-.865.501c-1.153.086-2.294.213-3.423.379-1.584.233-2.707 1.626-2.707 3.228v2.393m15.75-3.37c0-1.6-1.123-2.994-2.707-3.227-1.129-.166-2.27-.293-3.423-.379a1.067 1.067 0 01-.865-.5c-1.07-1.606-2.578-2.868-4.355-3.578 1.77-.71 3.278-1.972 4.347-3.577.195-.291.515-.475.865-.5 1.153-.086 2.294-.213 3.423-.379 1.584-.233 2.707-1.626 2.707-3.228V6m-15.75 0c0-1.6 1.123-2.994 2.707-3.227 1.129-.166 2.27-.293 3.423-.379a1.067 1.067 0 01.865-.5c1.07-1.605 2.578-2.868 4.355-3.577-1.77.709-3.278 1.972-4.347 3.577-.195.291-.515.475-.865.501-1.153.086-2.294.213-3.423.379-1.584.233-2.707 1.626-2.707 3.228v1.5" />
                        </svg>
                        Feedback & Support
                      </button>
                      <button
                        onClick={onSignOut}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                      >
                        <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
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
          {!expandedRecipeId && (
            <>
              <h2 className="font-heading text-xl font-semibold text-[var(--theme-text)]">Search recipes</h2>
              <div className="mt-3 flex items-center gap-3">
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
                <div className="relative min-w-[180px]">
                  <label className="sr-only" htmlFor="discover-sort-order">
                    Sort recipes
                  </label>
                  <select
                    id="discover-sort-order"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
                    className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm text-[var(--theme-text)] outline-none transition focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-focus)]"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
                <button
                  onClick={startCreateRecipe}
                  title="Create a recipe"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent)] text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)] active:scale-95"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {['All', 'Favorites', 'My recipes'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        activeTag === tag
                          ? 'bg-[var(--theme-accent)] text-white'
                          : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {officialFilterTags.map(({ category, tags }) => {
                  const MAX_PER_CATEGORY = 5;
                  const visible = tags.slice(0, MAX_PER_CATEGORY);
                  const hidden = tags.slice(MAX_PER_CATEGORY);

                  return (
                    <div key={category}>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {visible.map(({ label, count }) => (
                          <button
                            key={label}
                            onClick={() => setActiveTag(label)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                              activeTag === label
                                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                                : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                            }`}
                          >
                            {label}
                            <span
                              className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${
                                activeTag === label
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[var(--theme-border)] text-[var(--theme-text-muted)]'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        ))}
                        {hidden.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowAllTags(showAllTags === category ? '' : category)
                              }
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                                showAllTags === category
                                  ? 'bg-[var(--theme-accent)] text-white'
                                  : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                              }`}
                            >
                              {showAllTags === category ? 'Less' : `+${hidden.length}`}
                            </button>
                            {showAllTags === category && (
                              <div className="absolute left-0 top-full z-30 mt-2 flex flex-wrap gap-1.5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-cozy-lg">
                                {hidden.map(({ label, count }) => (
                                  <button
                                    key={label}
                                    onClick={() => {
                                      setActiveTag(label);
                                      setShowAllTags('');
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                                      activeTag === label
                                        ? 'bg-[var(--theme-accent)] text-white'
                                        : 'bg-[var(--theme-surface-alt)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'
                                    }`}
                                  >
                                    {label}
                                    <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--theme-border)] px-1 text-[10px] font-semibold leading-none text-[var(--theme-text-muted)]">
                                      {count}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {communityFilterTags.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setShowAllTags(showAllTags === '__community' ? '' : '__community')
                      }
                      className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition"
                    >
                      Community ({communityFilterTags.length})
                      <svg
                        className={`h-3 w-3 transition ${showAllTags === '__community' ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showAllTags === '__community' && (
                      <div className="flex flex-wrap gap-1.5">
                        {communityFilterTags.map(({ label, count }) => (
                          <button
                            key={label}
                            onClick={() => setActiveTag(label)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                              activeTag === label
                                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                                : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                            }`}
                          >
                            {label}
                            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--theme-border)] px-1 text-[10px] font-semibold leading-none text-[var(--theme-text-muted)]">
                              {count}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

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
                  {isPlaceholder(expandedRecipe.image) ? (
                    <div className="flex h-64 w-full flex-col items-center justify-center bg-[var(--theme-surface-alt)] sm:h-80">
                      <svg className="mb-2 h-12 w-12 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      <span className="text-sm font-medium text-[var(--theme-text-muted)]">Add Photo</span>
                    </div>
                  ) : (
                    <img
                      src={expandedRecipe.image}
                      alt={expandedRecipe.name}
                      className="h-64 w-full object-cover sm:h-80"
                    />
                  )}
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

                    {expandedRecipe.notes && expandedRecipe.notes.trim() && (
                      <section>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--theme-text)]">
                          Notes
                        </h4>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--theme-text)]">
                          {expandedRecipe.notes}
                        </p>
                      </section>
                    )}
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
                      {isPlaceholder(recipe.image) ? (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--theme-surface-alt)]">
                          <svg className="mb-2 h-10 w-10 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                          </svg>
                          <span className="text-sm font-medium text-[var(--theme-text-muted)]">Add Photo</span>
                        </div>
                      ) : (
                        <img
                          src={recipe.image}
                          alt={recipe.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      )}
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
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--theme-text-muted)]">
                        <span>by {recipe.author}</span>
                        {isRecipeNew(recipe) && (
                          <span className="rounded-full bg-[var(--theme-accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                            New
                          </span>
                        )}
                      </div>
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
                placeholder="e.g., Grandma's Apple Pie"
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
                placeholder="A short summary of your dish"
                className="ak-input h-20 resize-none rounded-lg px-3 py-2 outline-none transition"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Notes</span>
              <textarea
                value={draft.notes || ''}
                onChange={(event) =>
                  updateDraft('notes', event.target.value)
                }
                placeholder="Add notes or tips for your recipe"
                className="ak-input h-20 resize-none rounded-lg px-3 py-2 outline-none transition"
              />
            </label>

            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(170px,0.5fr)_minmax(0,1fr)] md:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Prep time</span>
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
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-semibold">Tags</span>
              <div className="relative grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <input
                    value={newTagValue}
                    onChange={(event) => setNewTagValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      addTag();
                    }}
                    placeholder="e.g., Quick, Vegetarian, Dessert"
                    className="ak-input rounded-lg px-3 py-2 text-sm outline-none w-full"
                    disabled={draft.tags.length >= 10}
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-cozy-lg">
                      {tagSuggestions.map((tag) => {
                        const category = tagCategoryMap.get(tag.toLowerCase());
                        return (
                          <button
                            key={tag}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateDraft('tags', [...draft.tags, tag]);
                              setNewTagValue('');
                            }}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-[var(--theme-text)] hover:bg-[var(--theme-surface-alt)] transition"
                          >
                            <span>{tag}</span>
                            {category && (
                              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--theme-text-muted)]">
                                {category}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addTag}
                  disabled={draft.tags.length >= 10}
                  className="ak-button-secondary rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Add tag
                </button>
              </div>
              {draft.tags.length >= 10 && (
                <p className="text-xs text-[var(--theme-text-muted)]">Maximum of 10 tags allowed</p>
              )}
              <div className="flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm"
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
                        placeholder="e.g., All-purpose flour"
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
                        placeholder="e.g., 2"
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
                        placeholder="e.g., cups"
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
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--theme-surface)] text-sm font-semibold text-[var(--theme-accent-strong)] ring-1 ring-[var(--theme-border)]">
                      {index + 1}
                    </span>
                    <textarea
                      value={instruction}
                      onChange={(event) =>
                        updateInstruction(index, event.target.value)
                      }
                      placeholder="e.g., Preheat oven to 375°F"
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Utensils Needed</h3>
                <button
                  onClick={addUtensil}
                  className="ak-button-secondary rounded-md px-3 py-1.5 text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              <div className="grid gap-2">
                {draft.utensils.map((utensil, index) => (
                  <div
                    key={`utensil-${index}`}
                    className="ak-surface-alt grid min-w-0 grid-cols-[1fr_auto] gap-2 rounded-xl border p-3"
                  >
                    <input
                      aria-label="Utensil"
                      value={utensil}
                      onChange={(event) =>
                        updateUtensil(index, event.target.value)
                      }
                      placeholder="e.g., Mixing bowl, Chef's knife"
                      className="ak-input min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
                    />
                    <button
                      onClick={() => removeUtensil(index)}
                      className="ak-button-secondary ak-muted h-10 w-10 rounded-lg text-sm font-semibold"
                      aria-label="Remove utensil"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="absolute inset-x-4 top-28 z-10 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_96%,transparent)] p-5 text-center shadow-2xl backdrop-blur">
              <p className="text-[var(--theme-accent)] text-xs font-semibold uppercase">
                Account Required
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-normal">
                Start publishing your own recipes
              </h3>
              <p className="text-[var(--theme-text-muted)] mx-auto mt-2 max-w-sm text-sm leading-6">
                Log in to add ingredients, write steps, and post recipes to the
                shared feed.
              </p>
              <button
                onClick={onRequestAuth}
                className="mt-4 rounded-lg bg-[var(--theme-sage)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-sage-strong)]"
              >
                Log in to create
              </button>
            </div>
          )}
        </section>

        <section
          id="profile"
          key={currentView === 'Profile' ? 'profile-visible' : 'profile-hidden'}
          className={`min-h-0 overflow-y-auto ${
            currentView === 'Profile' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-accent)] text-xl font-bold text-white">
                {selectedAvatar ? (
                  <img src={avatarEntries.find((e) => e.file === selectedAvatar)?.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  creatorName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold text-[var(--theme-text)]">Profile</h2>
                <p className="text-sm text-[var(--theme-text-muted)]">
                  {userAttributes?.email || currentUser?.username}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--theme-text)]">Choose an avatar</p>
                <button
                  onClick={shuffleAvatars}
                  className="rounded-lg p-1.5 text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-accent)]"
                  title="Shuffle avatars"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {shuffledAvatars.map(({ file, url }) => (
                  <button
                    key={file}
                    onClick={() => setSelectedAvatar(file)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition hover:opacity-90 ${
                      selectedAvatar === file
                        ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]'
                        : 'border-transparent hover:border-[var(--theme-border)]'
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Display name</span>
                <input
                  ref={profileNameRef}
                  defaultValue={savedProfileData.displayName}
                  placeholder="Your display name"
                  className="ak-input rounded-lg px-3 py-2 text-sm outline-none transition"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Bio</span>
                <textarea
                  ref={profileBioRef}
                  defaultValue={savedProfileData.bio}
                  placeholder="A short bio about yourself"
                  rows={3}
                  className="ak-input h-20 resize-none rounded-lg px-3 py-2 text-sm outline-none transition"
                />
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={saveProfile}
                className="rounded-lg bg-[var(--theme-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)]"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setSelectedAvatar(savedProfileData.avatar);
                  setCurrentView('Discover');
                }}
                className="rounded-lg border border-[var(--theme-border)] px-5 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
              >
                Cancel
              </button>
            </div>
          </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingRecipeId(null);
                        setPublishMessage('');
                        setPublishMessageTone('error');
                        setCurrentView('Discover');
                      }}
                      className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                    >
                      Cancel
                    </button>
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
                  </div>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <article className="overflow-hidden rounded-xl border border-[var(--theme-border)]">
                {isPlaceholder(imagePreviewUrl) ? (
                  <div
                    className="group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-alt)] transition-all hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/5"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>('#recipe-photo-input-sidebar');
                      input?.click();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        const input = document.querySelector<HTMLInputElement>('#recipe-photo-input-sidebar');
                        input?.click();
                      }
                    }}
                  >
                    <svg className="mb-2 h-10 w-10 text-[var(--theme-text-muted)] transition-all group-hover:scale-110 group-hover:text-[var(--theme-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--theme-text-muted)] transition-all group-hover:text-[var(--theme-accent)]">Add Photo</span>
                    <input
                      id="recipe-photo-input-sidebar"
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateImageFile(event.target.files?.[0])}
                      className="sr-only"
                    />
                  </div>
                ) : (
                  <img
                    src={imagePreviewUrl}
                    alt={draft.name || 'Recipe preview'}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
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
