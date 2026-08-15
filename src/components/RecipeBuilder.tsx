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
import {
  Bookmark,
  Copy,
  Mail,
  MessageCircle,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import type { Schema } from '../../amplify/data/resource';
import { getCloudFrontDomain } from '../amplifyConfig';
import {
  deleteRecipeDraft,
  EMPTY_RECIPE_DRAFT,
  isRecipeDraftEmpty,
  loadRecipeDraftsForOwner,
  saveRecipeDraft,
  type RecipeDraft,
  type RecipeDraftRecord,
  type RecipeIngredientDraft,
} from '../utils/recipeDrafts';
import {
  buildSuggestedUsername,
  getDisplayNameFromAuth,
  getProfileRoutePath,
  getProfileShareUrl,
  getRecipeRoutePath,
  getRouteTargetFromPathname,
  getUsernameFromAuth,
  loadUserProfiles,
  saveUserProfiles,
  sanitizeUsername,
  syncUserProfilesToBackend,
  upsertUserProfile,
  validateProfileIdentity,
  type UserProfile,
} from '../utils/userProfiles';
import UserProfileView from './UserProfileView';
import { syncProfileToCognito } from '../utils/cognitoProfileSync';

const client: any = generateClient<Schema>();
const doGetUrl = getUrl;
const doUploadData = uploadData;
const RECIPE_BUILDER_VIEW_KEY = 'arcaneKitchen.currentView';
const RECIPE_BUILDER_FAVORITES_KEY = 'arcaneKitchen.favoriteRecipeIds';
type RecipeBuilderView = 'Discover' | 'Build' | 'Profile' | 'SavedRecipes' | 'Drafts';

const getInitialRecipeBuilderView = (): RecipeBuilderView => {
  if (typeof window === 'undefined' || !window.localStorage) return 'Discover';

  const savedView = window.localStorage.getItem(RECIPE_BUILDER_VIEW_KEY);

  if (
    savedView === 'Discover' ||
    savedView === 'Build' ||
    savedView === 'Profile' ||
    savedView === 'SavedRecipes' ||
    savedView === 'Drafts'
  ) {
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
  currentUser?.userId || currentUser?.username || userAttributes?.sub || null;

interface RecipeBuilderProps {
  isAuthenticated: boolean;
  currentUser: any;
  userAttributes?: any;
  onRequestAuth?: () => void;
  onSignOut?: () => void;
  onProfileSaved?: () => void;
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
  authorHandle?: string;
}

interface RecipeQuantity {
  amount?: string;
  unit?: string;
}

interface CommentItemData {
  id: string;
  recipeId: string;
  userId: string;
  author: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface CommentItemProps {
  comment: CommentItemData;
  replies: CommentItemData[];
  isReply: boolean;
  currentUserId: string | null;
  onReply: (id: string, author: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  replyingTo: string | null;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  replies,
  isReply,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  replyingTo,
  editingCommentId,
  setEditingCommentId,
}) => {
  const [editValue, setEditValue] = useState(comment.content);
  const isOwner = currentUserId === comment.userId;
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="font-medium text-[var(--theme-accent)]">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div>
      <div className={`rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 ${isReply ? 'ml-4 border-l-2 border-l-[var(--theme-border)] border-t-0 border-r-0 border-b-0 rounded-none' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-medium text-[var(--theme-text)]">{comment.author}</span>
            <span className="ml-2 text-xs text-[var(--theme-text-muted)]">
              {timeAgo(comment.createdAt)}
              {comment.updatedAt && <span className="ml-1 italic">(edited)</span>}
            </span>
          </div>
          {isOwner && (
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => {
                  if (editingCommentId === comment.id) {
                    setEditingCommentId(null);
                    setEditValue(comment.content);
                  } else {
                    setEditingCommentId(comment.id);
                    setEditValue(comment.content);
                  }
                }}
                className="rounded px-1.5 py-0.5 text-xs text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)] transition"
              >
                {editingCommentId === comment.id ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="rounded px-1.5 py-0.5 text-xs text-[var(--theme-text-muted)] hover:bg-red-50 hover:text-red-600 transition"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {editingCommentId === comment.id ? (
          <div className="mt-2 flex gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] px-2 py-1 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]"
            />
            <button
              onClick={() => onEdit(comment.id, editValue)}
              disabled={!editValue.trim()}
              className="rounded bg-[var(--theme-accent)] px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-[var(--theme-text)] whitespace-pre-wrap">{renderContent(comment.content)}</p>
        )}
        {!isReply && (
          <div className="mt-1.5 flex gap-2">
            <button
              onClick={() => onReply(comment.id, comment.author)}
              className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition"
            >
              Reply
            </button>
          </div>
        )}
      </div>
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              isReply
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              replyingTo={replyingTo}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FeedRecipeCardProps {
  recipe: FeedRecipe;
  isFavorited: boolean;
  isPendingFavorite: boolean;
  saveCount: number;
  onOpenRecipe: (recipe: FeedRecipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onEditRecipe?: (recipeId: string, recipeOwnerId: string) => void;
  onDeleteRecipe?: (recipeId: string, recipeOwnerId: string) => void;
  loadingEditRecipeId?: string | null;
  deletingRecipeIds?: Set<string>;
  armedDeleteRecipeIds?: Set<string>;
  currentUserId?: string | null;
  isAuthenticated?: boolean;
  onOpenProfile?: (username: string) => void;
}

const FeedRecipeCard: React.FC<FeedRecipeCardProps> = ({
  recipe,
  isFavorited,
  isPendingFavorite,
  saveCount,
  onOpenRecipe,
  onToggleFavorite,
  onEditRecipe,
  onDeleteRecipe,
  loadingEditRecipeId,
  deletingRecipeIds,
  armedDeleteRecipeIds,
  currentUserId,
  isAuthenticated,
  onOpenProfile,
}) => (
  <article
    key={recipe.id}
    className="group cursor-pointer overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm transition-all hover:-translate-y-1 hover:shadow-cozy-lg"
    onClick={() => void onOpenRecipe(recipe)}
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
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-heading text-lg font-semibold leading-snug text-[var(--theme-text)]">
        {recipe.name}
      </h3>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--theme-text-muted)]">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (recipe.authorHandle) {
              onOpenProfile?.(recipe.authorHandle);
            }
          }}
          className="text-left font-medium text-[var(--theme-accent)] transition hover:underline"
        >
          by {recipe.author}
        </button>
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
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onToggleFavorite(recipe.id);
            }}
            disabled={isPendingFavorite}
            aria-label={isFavorited ? `Unsave ${recipe.name}` : `Save ${recipe.name}`}
            className="flex items-center gap-1 transition hover:text-[var(--theme-accent)] disabled:opacity-60"
          >
            <svg
              className={`h-3.5 w-3.5 ${isFavorited ? 'text-[var(--theme-accent)]' : ''} transition`}
              viewBox="0 0 24 24"
              fill={isFavorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span>{saveCount}</span>
          </button>
        </span>
      </div>
      {isAuthenticated && currentUserId && recipe.ownerId === currentUserId && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onEditRecipe?.(recipe.id, recipe.ownerId);
            }}
            disabled={loadingEditRecipeId === recipe.id}
            className="rounded-md border border-[var(--theme-border)] px-2.5 py-1 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)] disabled:opacity-60"
          >
            {loadingEditRecipeId === recipe.id ? 'Opening...' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onDeleteRecipe?.(recipe.id, recipe.ownerId);
            }}
            disabled={deletingRecipeIds?.has(recipe.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-60 ${
              armedDeleteRecipeIds?.has(recipe.id)
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[var(--theme-text-muted)] hover:bg-red-600'
            }`}
          >
            {deletingRecipeIds?.has(recipe.id)
              ? 'Deleting...'
              : armedDeleteRecipeIds?.has(recipe.id)
                ? 'Delete permanently'
                : 'Delete'}
          </button>
        </div>
      )}
    </div>
  </article>
);

const IMAGE_PLACEHOLDER = '__no_image__';
const neutralImagePlaceholder = IMAGE_PLACEHOLDER;
const isPlaceholder = (src: string) => src === IMAGE_PLACEHOLDER || src === neutralImagePlaceholder;

const isRecipeNew = (recipe: FeedRecipe) => {
  if (!recipe.createdAt) return false;
  const createdAt = dayjs(recipe.createdAt);
  return createdAt.isValid() && dayjs().diff(createdAt, 'day') < 30;
};

function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = atob(parts[1] || '');
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  return new File([array], filename, { type: mime });
}

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

const getCloudFrontDomainOrDefault = () => {
  const fromConfig = getCloudFrontDomain();
  if (fromConfig) return fromConfig;
  if (typeof import.meta !== 'undefined') return import.meta.env.VITE_CLOUDFRONT_DOMAIN;
  return undefined;
};

const getRecipeImageSource = async (imageUrl?: string | null) => {
  if (!imageUrl) return neutralImagePlaceholder;
  if (isRemoteUrl(imageUrl)) return imageUrl;

  const cdnDomain = getCloudFrontDomainOrDefault();
  if (cdnDomain) {
    return `https://${cdnDomain}/${imageUrl}`;
  }

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
  onProfileSaved,
}) => {
  const isTabLocked = (tab: RecipeBuilderView) =>
    !isAuthenticated && tab === 'Build';
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_RECIPE_DRAFT);
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
  const [draftRecords, setDraftRecords] = useState<RecipeDraftRecord[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    getInitialFavoriteRecipeIds
  );
  const [pendingFavoriteRecipeIds, setPendingFavoriteRecipeIds] = useState<
    Set<string>
  >(() => new Set());
  const [recipeSaves, setRecipeSaves] = useState<Record<string, number>>({});
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [expandedRecipeIngredients, setExpandedRecipeIngredients] = useState<
    Record<string, string[]>
  >({});
  const [loadingExpandedRecipeId, setLoadingExpandedRecipeId] = useState<
    string | null
  >(null);
  const [expandedRecipeMessage, setExpandedRecipeMessage] = useState('');
  const [comments, setComments] = useState<Record<string, Array<{ id: string; recipeId: string; userId: string; author: string; content: string; parentId: string | null; createdAt: string; updatedAt?: string }>>>({});
  const [visibleCommentCount, setVisibleCommentCount] = useState<Record<string, number>>({});
  const COMMENTS_PER_PAGE = 5;
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string>('');
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCursor, setMentionCursor] = useState(0);
  const [shareNotice, setShareNotice] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftImageDataUrl, setDraftImageDataUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(neutralImagePlaceholder);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSavePending, setUsernameSavePending] = useState(false);
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string | null>(null);
  const shareNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const draftAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftHydratedRef = useRef(false);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [newTagValue, setNewTagValue] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [loadingEditRecipeId, setLoadingEditRecipeId] = useState<string | null>(
    null
  );
  const currentUserId = getCurrentUserId(currentUser, userAttributes);

  const PROFILE_CACHE_KEY = currentUserId
    ? `arcaneKitchen.profileCache.${currentUserId}`
    : null;

  const cachedProfile = useMemo(() => {
    if (!PROFILE_CACHE_KEY || typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  }, [PROFILE_CACHE_KEY]);

  const cachedName = cachedProfile?.nickname || cachedProfile?.emailPrefix || null;
  const profileAvatar = userAttributes?.['custom:avatar'] || cachedProfile?.avatar || null;
  const profileBio = userAttributes?.['custom:bio'] ?? cachedProfile?.bio ?? '';
  const localProfiles = useMemo(() => loadUserProfiles(), [currentUserId, profileData]);
  const activeProfile = currentUserId ? localProfiles[currentUserId] : null;
  const activeUsername = activeProfile?.username || getUsernameFromAuth(currentUser, userAttributes) || sanitizeUsername(getDisplayNameFromAuth(currentUser, userAttributes));
  // Prefer the freshly saved local profile value for display. userAttributes
  // only refresh at sign-in, so a Cognito avatar would otherwise shadow any
  // change made during the session.
  const effectiveAvatar = activeProfile?.avatar || profileAvatar || null;
  const profileRouteProfile = useMemo(() => {
    if (!viewingProfileUsername) return null;
    return Object.values(localProfiles).find((profile: any) => sanitizeUsername(profile.username) === sanitizeUsername(viewingProfileUsername)) || null;
  }, [localProfiles, viewingProfileUsername]);
  const isViewingExternalProfile = currentView === 'Profile' && viewingProfileUsername !== null;
  const creatorName = getCreatorName(userAttributes, currentUser) !== 'Guest cook'
    ? getCreatorName(userAttributes, currentUser)
    : (cachedName || activeProfile?.displayName || 'Guest cook');

  const avatarEntries = useMemo(
    () => Object.entries(import.meta.glob<{ default: string }>('/src/assets/avatars/*.webp', { eager: true })).map(([path, mod]) => ({
      file: path.split('/').pop()!,
      url: mod.default,
    })),
    [],
  );

  const avatarUrl = effectiveAvatar
    ? avatarEntries.find((e) => e.file === effectiveAvatar)?.url || null
    : null;

  const openProfileRoute = useCallback((username: string) => {
    const normalized = sanitizeUsername(username);
    if (!normalized) return;

    if (typeof window !== 'undefined') {
      const nextPath = getProfileRoutePath(normalized);
      window.history.pushState({}, '', nextPath);
    }

    setViewingProfileUsername(normalized);
    setCurrentView('Profile');
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setDraftRecords([]);
      setDraftId(null);
      setDraftImageDataUrl(null);
      setDraft(EMPTY_RECIPE_DRAFT);
      setEditingRecipeId(null);
      setImagePreviewUrl(neutralImagePlaceholder);
      setSelectedImageFile(null);
      draftHydratedRef.current = true;
      return;
    }

    let cancelled = false;
    draftHydratedRef.current = true;

    const hydrateDrafts = async () => {
      const records = await loadRecipeDraftsForOwner(currentUserId);

      if (cancelled) return;

      setDraftRecords(records);
    };

    void hydrateDrafts();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (currentView === 'Profile') {
      setSelectedAvatar(effectiveAvatar);
    }
  }, [currentView, effectiveAvatar]);

  useEffect(() => {
    if (!currentUserId) {
      setProfileSetupOpen(false);
      return;
    }

    const profiles = loadUserProfiles();
    const existing = profiles[currentUserId];

    // Only seed auth-derived defaults when a profile does not exist yet.
    // Auth attributes arrive in two passes on refresh (a persisted subset
    // first, then the full set), so overwriting here makes name/bio/avatar
    // flicker to intermediate values. Never clobber a saved profile.
    const nextProfile: Record<string, UserProfile> = existing
      ? { ...profiles, [currentUserId]: existing }
      : upsertUserProfile(profiles, {
          userId: currentUserId,
          displayName: getDisplayNameFromAuth(currentUser, userAttributes),
          currentUser,
          userAttributes,
          avatar: profileAvatar,
          bio: profileBio,
        });

    const savedProfile = nextProfile[currentUserId];
    setProfileData(savedProfile);
    saveUserProfiles(nextProfile);
    void syncUserProfilesToBackend(nextProfile, client);

    // Only prompt for the onboarding modal when the profile explicitly
    // requires username setup. Do not auto-open for missing fields.
    const shouldPromptForSetup = Boolean(savedProfile && savedProfile.needsUsernameSetup);

    if (shouldPromptForSetup) {
      setDisplayNameDraft(savedProfile.displayName || '');
      setUsernameDraft(savedProfile.username || '');
      setProfileSetupOpen(true);
    } else {
      setProfileSetupOpen(false);
    }
  }, [currentUserId, currentUser, userAttributes, profileAvatar, profileBio]);

  useEffect(() => {
    if (PROFILE_CACHE_KEY && userAttributes?.nickname) {
      try {
        const existing = localStorage.getItem(PROFILE_CACHE_KEY);
        const data = existing ? JSON.parse(existing) : {};
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
          ...data,
          nickname: userAttributes.nickname,
          emailPrefix: userAttributes.email?.split('@')[0],
        }));
      } catch { /* ignore */ }
    }
  }, [userAttributes]);

  const saveUsernameSetup = async () => {
    if (!currentUserId) return;

    const nextName = displayNameDraft.trim();
    const profiles = loadUserProfiles();
    const existingUsernames = Object.values(profiles)
      .filter((profile) => profile.userId !== currentUserId)
      .map((profile) => profile.username);
    const suggestedUsername = buildSuggestedUsername(nextName, existingUsernames);
    const nextUsername = sanitizeUsername(usernameDraft) || suggestedUsername;

    const errorMessage = validateProfileIdentity({
      profiles,
      userId: currentUserId,
      displayName: nextName,
      username: nextUsername,
      profile: profiles[currentUserId],
    });

    if (errorMessage) {
      setUsernameError(errorMessage);
      return;
    }

    setUsernameError('');
    setUsernameSavePending(true);

    try {
      const finalUsername = nextUsername;
      const nextProfiles = upsertUserProfile(profiles, {
        userId: currentUserId,
        displayName: nextName,
        username: finalUsername,
        currentUser,
        userAttributes,
        needsUsernameSetup: false,
      });

      saveUserProfiles(nextProfiles);
      void syncUserProfilesToBackend(nextProfiles, client);
      void syncProfileToCognito({
        displayName: nextName,
      });
      setProfileData(nextProfiles[currentUserId]);
      setProfileSetupOpen(false);
      setUsernameDraft(finalUsername);
      setDisplayNameDraft(nextName);
    } catch (error) {
      console.error('Failed to save username profile:', error);
      setUsernameError('We could not save your username right now.');
    } finally {
      setUsernameSavePending(false);
    }
  };

  const handleSelectAvatarPreset = (file: string) => {
    const uid = currentUserId || 'current';
    const profiles = loadUserProfiles();
    const existingProfile = profiles[uid];
    const updated = upsertUserProfile(profiles, {
      userId: uid,
      avatar: file,
      // preserve the saved identity so upsert does not re-derive it from auth
      displayName: existingProfile?.displayName,
      username: existingProfile?.username,
    });
    saveUserProfiles(updated);
    void syncUserProfilesToBackend(updated, client);
    void syncProfileToCognito({ avatar: file });
    setProfileData(updated[uid]);
    setSelectedAvatar(file);
  };

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

      const profilesByOwnerId = loadUserProfiles();

      const recipes = await Promise.all(
        data
          .filter((recipe: any) => recipe.id && recipe.name)
          .map(async (recipe: any) => {
            const profileForOwner = profilesByOwnerId[recipe.ownerId || ''];
            const authorHandle = profileForOwner?.username || undefined;
            const authorName = profileForOwner?.displayName || recipe.createdBy || 'Arcane cook';

            return {
              id: recipe.id as string,
              ownerId: recipe.ownerId || '',
              name: recipe.name,
              author: authorName,
              authorHandle,
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
            };
          })
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
    if (typeof window === 'undefined') return;

    const syncRecipeRoute = async () => {
      const routeTarget = getRouteTargetFromPathname(
        `${window.location.pathname}${window.location.search}`
      );

      if (!routeTarget) {
        if (expandedRecipeId) {
          setExpandedRecipeId(null);
        }
        setExpandedRecipeMessage('');
        setViewingProfileUsername(null);
        return;
      }

      if (routeTarget.type === 'profile') {
        setViewingProfileUsername(routeTarget.username);
        setCurrentView('Profile');
        return;
      }

      setViewingProfileUsername(null);

      const recipeIdFromPath = routeTarget.recipeId;
      const matchingRecipe = feedRecipes.find((recipe) => recipe.id === recipeIdFromPath);

      if (matchingRecipe) {
        if (expandedRecipeId !== matchingRecipe.id) {
          void expandRecipe(matchingRecipe);
        }
        return;
      }

      if (isLoadingFeed || expandedRecipeId === recipeIdFromPath) return;

      try {
        const authMode = isAuthenticated ? 'userPool' : 'identityPool';
        const result = await client.models.Recipe.get(
          { id: recipeIdFromPath },
          { authMode }
        );

        if (result.errors?.length || !result.data) {
          throw new Error('not found');
        }

        const recipe = result.data;
        const profilesByOwnerId = loadUserProfiles();
        const profileForOwner = profilesByOwnerId[recipe.ownerId || ''];
        const authorHandle = profileForOwner?.username || undefined;
        const authorName = profileForOwner?.displayName || recipe.createdBy || 'Arcane cook';

        const directRecipe: FeedRecipe = {
          id: recipe.id as string,
          ownerId: recipe.ownerId || '',
          name: recipe.name,
          author: authorName,
          authorHandle,
          createdAt: recipe.createdAt ? String(recipe.createdAt) : undefined,
          description: recipe.description || 'No description yet.',
          image: await getRecipeImageSource(recipe.imageUrl),
          time: recipe.prepTime || 'Prep time open',
          rating: getBackendRating(recipe.ratings),
          saves: 'New',
          tags: (recipe.tags?.filter(Boolean) as string[]) ?? [],
          instructions: (recipe.instructions?.filter(Boolean) as string[]) ?? [],
          utensils: (recipe.utensils?.filter(Boolean) as string[]) ?? [],
        };

        setFeedRecipes((previous) =>
          previous.some((existing) => existing.id === directRecipe.id)
            ? previous
            : [directRecipe, ...previous]
        );

        void expandRecipe(directRecipe);
      } catch {
        setExpandedRecipeId(null);
        setExpandedRecipeMessage('Recipe could not be found.');
      }
    };

    window.addEventListener('popstate', syncRecipeRoute);
    void syncRecipeRoute();

    return () => {
      window.removeEventListener('popstate', syncRecipeRoute);
    };
  }, [expandedRecipeId, feedRecipes, isLoadingFeed, isAuthenticated]);

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
    let isCancelled = false;

    const loadSaveCounts = async () => {
      try {
        const { data, errors } = await client.models.Favorite.list({});

        if (errors?.length) {
          throw new Error(errors.map((error: any) => error.message).join(', '));
        }

        const counts: Record<string, number> = {};
        for (const favorite of data) {
          if (favorite.recipeId) {
            counts[favorite.recipeId] = (counts[favorite.recipeId] ?? 0) + 1;
          }
        }

        if (!isCancelled) {
          setRecipeSaves(counts);
        }
      } catch (error) {
        console.error('Failed to load save counts:', error);
      }
    };

    loadSaveCounts();
    return () => {
      isCancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (
      !draftHydratedRef.current ||
      !isAuthenticated ||
      !currentUserId ||
      currentView !== 'Build'
    ) {
      return;
    }

    if (isRecipeDraftEmpty(draft) && !draftId && !draftImageDataUrl) {
      return;
    }

    if (draftAutosaveTimeoutRef.current) {
      clearTimeout(draftAutosaveTimeoutRef.current);
    }

    draftAutosaveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        const savedDraft = await saveRecipeDraft({
          ownerId: currentUserId,
          draft,
          editingRecipeId,
          imageDataUrl: draftImageDataUrl,
          draftId,
        });

        if (savedDraft) {
          setDraftId(savedDraft.id);
          setDraftImageDataUrl(savedDraft.imageDataUrl);
          setDraftRecords((previous) => {
            const next = previous.filter(
              (record) => record.id !== savedDraft.id || record.ownerId !== currentUserId
            );
            return [savedDraft, ...next].sort(
              (left, right) => right.updatedAt - left.updatedAt
            );
          });
        } else if (draftId) {
          setDraftId(null);
          setDraftImageDataUrl(null);
          setDraftRecords((previous) =>
            previous.filter(
              (record) => record.ownerId !== currentUserId || record.id !== draftId
            )
          );
        }
      })();
    }, 450);

    return () => {
      if (draftAutosaveTimeoutRef.current) {
        clearTimeout(draftAutosaveTimeoutRef.current);
      }
    };
  }, [currentUserId, currentView, draft, draftId, draftImageDataUrl, editingRecipeId, isAuthenticated]);

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

  const savedRecipes = useMemo(
    () => feedRecipes.filter((recipe) => favoriteRecipeIds.has(recipe.id)),
    [favoriteRecipeIds, feedRecipes]
  );

  const profileViewUser = useMemo(() => {
    return {
      userId: currentUserId,
      id: currentUserId,
      name: activeProfile?.displayName || creatorName,
      handle: activeProfile?.username || activeUsername,
      bio: activeProfile?.bio || profileBio || '',
      avatarUrl: avatarUrl || undefined,
      joinDate: activeProfile?.createdAt || undefined,
      stats: {
        recipes: feedRecipes.filter((r) => r.ownerId === currentUserId).length,
        drafts: draftRecords.filter((d) => d.ownerId === currentUserId).length,
        likes: favoriteRecipeIds.size,
        saved: savedRecipes.length,
      },
    };
  }, [
    currentUserId,
    activeProfile,
    creatorName,
    activeUsername,
    profileBio,
    avatarUrl,
    feedRecipes,
    draftRecords,
    favoriteRecipeIds,
    savedRecipes,
  ]);

  const resumeDraft = (draftRecord: RecipeDraftRecord) => {
    setDraft(draftRecord.draft);
    setDraftId(draftRecord.id);
    setDraftImageDataUrl(draftRecord.imageDataUrl);
    setEditingRecipeId(draftRecord.editingRecipeId);
    setImagePreviewUrl(draftRecord.imageDataUrl || neutralImagePlaceholder);
    setSelectedImageFile(
      draftRecord.imageDataUrl
        ? dataUrlToFile(draftRecord.imageDataUrl, 'recipe-image.jpg')
        : null
    );
    setPublishMessage('Draft loaded.');
    setPublishMessageTone('success');
    setCurrentView('Build');
  };

  const removeDraftRecord = async (draftRecord: RecipeDraftRecord) => {
    if (!currentUserId) return;

    await deleteRecipeDraft(currentUserId, draftRecord.id);
    setDraftRecords((previous) =>
      previous.filter(
        (record) => record.ownerId !== currentUserId || record.id !== draftRecord.id
      )
    );

    if (draftId === draftRecord.id) {
      setDraft(EMPTY_RECIPE_DRAFT);
      setDraftId(null);
      setDraftImageDataUrl(null);
      setEditingRecipeId(null);
      setSelectedImageFile(null);
      setImagePreviewUrl(neutralImagePlaceholder);
    }
  };

  const visibleFeedRecipes = useMemo(() => {
    const query = discoverQuery.trim();

    const matchesTagFilter = (recipe: FeedRecipe) => {
      if (activeTag === 'All') return true;
      if (activeTag === 'Favorites') return favoriteRecipeIds.has(recipe.id);
      if (activeTag === 'My recipes') {
        return Boolean(currentUserId) && recipe.ownerId === currentUserId;
      }

      return recipe.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase());
    };

    const getRecipeSearchScore = (recipe: FeedRecipe, normalizedQuery: string) => {
      if (!normalizedQuery) return 0;

      const parts = [
        recipe.name,
        recipe.author,
        recipe.description,
        recipe.tags.join(' '),
        recipe.ownerId,
        recipe.authorHandle || '',
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      let score = 0;
      for (const part of parts) {
        if (!part) continue;
        if (part === normalizedQuery) score += 250;
        if (part.includes(normalizedQuery)) score += 100;
        if (part.startsWith(normalizedQuery)) score += 60;
        const tokens = part.split(/[^a-z0-9_]+/).filter(Boolean);
        if (tokens.some((token) => token.includes(normalizedQuery) || normalizedQuery.includes(token))) score += 30;
      }

      return score;
    };

    const filtered = feedRecipes.filter((recipe) => {
      const matchesTag = matchesTagFilter(recipe);
      if (!query) return matchesTag;

      const normalizedQuery = query.toLowerCase().replace(/^@/, '');
      const haystack = [
        recipe.name,
        recipe.author,
        recipe.description,
        recipe.tags.join(' '),
        recipe.ownerId,
        recipe.authorHandle || '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesHandle = normalizedQuery && activeUsername && activeUsername.toLowerCase().includes(normalizedQuery);
      const matchesProfileQuery = normalizedQuery && activeProfile?.username?.toLowerCase().includes(normalizedQuery);

      return matchesTag && (
        haystack.includes(query.toLowerCase()) ||
        haystack.includes(normalizedQuery) ||
        matchesHandle ||
        matchesProfileQuery ||
        getRecipeSearchScore(recipe, normalizedQuery) > 0
      );
    });

    const sorted = [...filtered].sort((left, right) => {
      const leftTime = left.createdAt ? dayjs(left.createdAt).valueOf() : 0;
      const rightTime = right.createdAt ? dayjs(right.createdAt).valueOf() : 0;
      if (sortOrder === 'desc') {
        return rightTime - leftTime;
      }
      return leftTime - rightTime;
    });

    if (!query) return sorted;

    const fallback = [...feedRecipes]
      .filter((recipe) => matchesTagFilter(recipe))
      .map((recipe) => ({ recipe, score: getRecipeSearchScore(recipe, query.toLowerCase().replace(/^@/, '')) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ recipe }) => recipe);

    return filtered.length ? sorted : fallback;
  }, [activeTag, activeProfile, activeUsername, currentUserId, discoverQuery, favoriteRecipeIds, feedRecipes, sortOrder]);

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

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreviewUrl(dataUrl);
      setDraftImageDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startCreateRecipe = () => {
    if (isTabLocked('Build')) {
      onRequestAuth?.();
      return;
    }

    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }

    setEditingRecipeId(null);
    if (!draftId && isRecipeDraftEmpty(draft)) {
      setSelectedImageFile(null);
      setDraftImageDataUrl(null);
      setImagePreviewUrl(neutralImagePlaceholder);
      setDraft(EMPTY_RECIPE_DRAFT);
    }
    setPublishMessage('');
    setPublishMessageTone('error');
    setNewTagValue('');
    setExpandedRecipeId(null);
    setCurrentView('Build');
  };

  const loadExampleRecipe = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }

    setEditingRecipeId(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(neutralImagePlaceholder);
    setDraft(EXAMPLE_DRAFT);
  setDraftImageDataUrl(null);
  setDraftId(null);
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
      setDraftId(null);
      setDraftImageDataUrl(null);
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
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
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

        const uploadTask = doUploadData({
          path: imageUrl,
          data: selectedImageFile,
          options: {
            accessLevel: 'protected',
            contentType: selectedImageFile.type || 'image/jpeg',
          } as typeof import('aws-amplify/storage').uploadData extends (
            input: infer T
          ) => unknown
            ? T extends { options?: infer U }
              ? U
              : never
            : never,
        });

        await uploadTask.result;
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
            authMode: 'userPool' as const,
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
      setDraft(EMPTY_RECIPE_DRAFT);
      setDraftImageDataUrl(null);
      if (draftId) {
        await deleteRecipeDraft(currentUserId, draftId);
      }
      setDraftId(null);
      setDraftRecords((previous) =>
        previous.filter((record) => record.ownerId !== currentUserId || record.id !== draftId)
      );
      setImagePreviewUrl(neutralImagePlaceholder);
      await loadRecipes();
      setActiveTag('All');
      setDiscoverQuery('');
      setExpandedRecipeId(null);
      setCurrentView('Discover');
    } catch (error) {
      console.error('Failed to save recipe:', error);

      let message = isEditingRecipe
        ? 'Update failed. Check your sandbox deployment and auth.'
        : 'Publish failed. Check your sandbox deployment and auth.';

      if (error instanceof Error) {
        if (error.message.includes('Missing bucket name')) {
          message =
            'Photo uploads need the latest backend deployment. Run npm run deploy:sandbox, then restart the frontend.';
        } else if (
          error.message.includes('storage is full') ||
          error.message.includes('quota has been exceeded')
        ) {
          message =
            'Not enough storage space for this image. Try a smaller photo or clear your browser storage for this site.';
        }
      }

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

        setRecipeSaves((previous) => {
          const next = { ...previous };
          next[recipeId] = Math.max(0, (next[recipeId] ?? 0) - 1);
          return next;
        });
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

        setRecipeSaves((previous) => {
          const next = { ...previous };
          next[recipeId] = (next[recipeId] ?? 0) + 1;
          return next;
        });
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

  const expandRecipe = async (
    recipe: FeedRecipe,
    options?: { stayInView?: boolean }
  ) => {
    setExpandedRecipeId(recipe.id);
    setExpandedRecipeMessage('');

    if (!options?.stayInView) {
      setCurrentView('Discover');
    }

    if (typeof window !== 'undefined' && window.location.pathname !== getRecipeRoutePath(recipe.id)) {
      window.history.pushState({}, '', getRecipeRoutePath(recipe.id));
    }

    if (isAuthenticated) {
      void fetchComments(recipe.id);
    }

    if (expandedRecipeIngredients[recipe.id]) return;

    setLoadingExpandedRecipeId(recipe.id);

    try {
      const authModes: Array<'userPool' | 'identityPool'> = isAuthenticated
        ? ['userPool', 'identityPool']
        : ['identityPool'];

      let data: Array<any> = [];
      let errors: Array<{ message: string }> | undefined;

      for (const authMode of authModes) {
        const result = await client.models.RecipeIngredient.list({
          filter: {
            recipeId: { eq: recipe.id },
          },
          authMode,
        });

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
    setComments((prev) => {
      const next = { ...prev };
      if (expandedRecipeId) delete next[expandedRecipeId];
      return next;
    });
    setVisibleCommentCount((prev) => {
      const next = { ...prev };
      if (expandedRecipeId) delete next[expandedRecipeId];
      return next;
    });
    setReplyingTo(null);
    setReplyingToAuthor('');
    setEditingCommentId(null);
    setCommentInput('');
    setShowMentions(false);
    setMentionQuery('');
    setMentionCursor(0);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  const fetchComments = async (recipeId: string) => {
    if (!isAuthenticated || !client) return;
    setLoadingComments(true);
    try {
      const result = await client.models.Comment.list({
        filter: { recipeId: { eq: recipeId } },
        authMode: 'userPool',
      });
      if (result.data) {
        setComments((prev) => ({
          ...prev,
          [recipeId]: result.data
            .filter((c: any) => c.id && c.userId && c.content)
            .map((c: any) => ({
              id: c.id,
              recipeId: c.recipeId,
              userId: c.userId,
              author: c.author || 'Unknown',
              content: c.content,
              parentId: c.parentId || null,
              createdAt: c.createdAt || '',
              updatedAt: c.updatedAt || undefined,
            }))
            .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)),
        }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingComments(false);
    }
  };

  const addComment = async (recipeId: string, parentId: string | null = null) => {
    if (!isAuthenticated || !client || !commentInput.trim() || !currentUserId) return;
    const content = commentInput.trim();
    setCommentInput('');
    setReplyingTo(null);
    setReplyingToAuthor('');
    setShowMentions(false);
    setMentionQuery('');
    setMentionCursor(0);
    try {
      const result = await client.models.Comment.create({
        recipeId,
        userId: currentUserId,
        author: creatorName,
        content,
        ...(parentId ? { parentId } : {}),
      }, { authMode: 'userPool' });
      if (result.data?.id) {
        const newComment = {
          id: result.data.id,
          recipeId,
          userId: currentUserId,
          author: creatorName,
          content,
          parentId,
          createdAt: result.data.createdAt || new Date().toISOString(),
        };
        setComments((prev) => ({
          ...prev,
          [recipeId]: [newComment, ...(prev[recipeId] || [])],
        }));
        setVisibleCommentCount((prev) => ({
          ...prev,
          [recipeId]: (prev[recipeId] || COMMENTS_PER_PAGE) + 1,
        }));
      }
    } catch {
      setCommentInput(content);
    }
  };

  const editComment = async (commentId: string, recipeId: string, newContent: string) => {
    if (!client || !newContent.trim()) return;
    try {
      const result = await client.models.Comment.update({
        id: commentId,
        content: newContent.trim(),
      }, { authMode: 'userPool' });
      if (result.data) {
        setComments((prev) => ({
          ...prev,
          [recipeId]: (prev[recipeId] || []).map((c) =>
            c.id === commentId ? { ...c, content: newContent.trim(), updatedAt: result.data?.updatedAt || c.updatedAt } : c
          ),
        }));
        setEditingCommentId(null);
      }
    } catch {
      // ignore
    }
  };

  const deleteComment = async (commentId: string, recipeId: string) => {
    if (!client) return;
    try {
      await client.models.Comment.delete({ id: commentId }, { authMode: 'userPool' });
      setComments((prev) => ({
        ...prev,
        [recipeId]: (prev[recipeId] || []).filter((c) => c.id !== commentId),
      }));
    } catch {
      // ignore
    }
  };

  const getCommentAuthors = () => {
    const allComments = comments[expandedRecipeId || ''] || [];
    const seen = new Set<string>();
    const authors: string[] = [];
    for (const c of allComments) {
      if (!seen.has(c.author)) {
        seen.add(c.author);
        authors.push(c.author);
      }
    }
    if (!seen.has(creatorName)) authors.unshift(creatorName);
    return authors;
  };

  const handleCommentInput = (value: string) => {
    setCommentInput(value);
    const atMatch = value.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      setMentionCursor(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (author: string) => {
    const atIdx = commentInput.lastIndexOf('@');
    if (atIdx === -1) return;
    const before = commentInput.slice(0, atIdx);
    const after = commentInput.slice(atIdx).replace(/@\w*$/, '');
    setCommentInput(`${before}@${author} ${after}`);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => commentInputRef.current?.focus(), 10);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      const authors = getCommentAuthors().filter((a) =>
        a.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionCursor((c) => Math.min(c + 1, authors.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionCursor((c) => Math.max(c - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (authors[mentionCursor]) insertMention(authors[mentionCursor]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void addComment(expandedRecipeId!, replyingTo);
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
      if (typeof window !== 'undefined' && window.location.pathname === getRecipeRoutePath(recipeId)) {
        window.history.replaceState({}, '', '/');
      }
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

  const getRecipeShareUrl = (recipe: FeedRecipe) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${getRecipeRoutePath(recipe.id)}`;
  };

  const shareProfile = async (username: string) => {
    if (typeof window === 'undefined') return;

    const shareUrl = getProfileShareUrl(username, window.location.origin);
    if (!shareUrl) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `@${username} on Arcane Kitchen`,
          url: shareUrl,
        });
        setShareNotice('Profile link shared');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareNotice('Profile link copied to clipboard');
      } else {
        setShareNotice('Profile link ready to share');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      setShareNotice('Profile sharing is not available right now');
    }

    setShowShareMenu(false);
  };

  const copyRecipeLink = async (shareUrl: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof window !== 'undefined') {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = shareUrl;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.left = '-9999px';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand('copy');
        document.body.removeChild(temporaryInput);
      }
      setShareNotice('Recipe link copied to clipboard');
    } catch {
      setShareNotice('Could not copy the recipe link');
    }

    setShowShareMenu(false);
  };

  const openShareLink = (shareUrl: string, platform: 'whatsapp' | 'email' | 'telegram') => {
    const encodedUrl = encodeURIComponent(shareUrl);
    let shareTarget = '';

    if (platform === 'whatsapp') {
      shareTarget = `https://wa.me/?text=${encodeURIComponent(`Check out this recipe: ${shareUrl}`)}`;
    } else if (platform === 'email') {
      const subject = encodeURIComponent('Check out this recipe');
      const body = encodeURIComponent(`Check out this recipe\n\n${shareUrl}`);
      shareTarget = `mailto:?subject=${subject}&body=${body}`;
    } else if (platform === 'telegram') {
      shareTarget = `https://t.me/share/url?url=${encodedUrl}`;
    }

    if (shareTarget) {
      window.open(shareTarget, '_blank', 'noopener,noreferrer');
      setShareNotice(`Opened ${platform === 'whatsapp' ? 'WhatsApp' : platform === 'email' ? 'Email' : 'Telegram'}`);
    }

    setShowShareMenu(false);
  };

  const shareRecipe = async (recipe: FeedRecipe) => {
    if (typeof window === 'undefined') return;

    const shareUrl = getRecipeShareUrl(recipe);

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: recipe.name,
          text: recipe.description || 'Check out this recipe',
          url: shareUrl,
        });
        setShareNotice('Recipe link shared');
        setShowShareMenu(false);
      } else {
        setShowShareMenu((previous) => !previous);
        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      setShareNotice('Sharing is not available right now');
      setShowShareMenu(false);
    }

    if (shareNoticeTimeoutRef.current) {
      clearTimeout(shareNoticeTimeoutRef.current);
    }

    shareNoticeTimeoutRef.current = setTimeout(() => {
      setShareNotice('');
      shareNoticeTimeoutRef.current = null;
    }, 2400);
  };

  useEffect(() => {
    if (!showShareMenu) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node)
      ) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      if (shareNoticeTimeoutRef.current) {
        clearTimeout(shareNoticeTimeoutRef.current);
      }
    };
  }, [showShareMenu]);

const expandedRecipeArticle = expandedRecipe ? (
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

                </div>
                <div className="grid gap-5 p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-normal">
                        {expandedRecipe.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (expandedRecipe.authorHandle) {
                            openProfileRoute(expandedRecipe.authorHandle);
                          }
                        }}
                        className="mt-1 text-left text-sm text-[var(--theme-text-muted)] transition hover:text-[var(--theme-accent)] hover:underline"
                      >
                        by {expandedRecipe.author}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {shareNotice && (
                        <div className="w-full rounded border border-[#b7d9c8] bg-[#edf9f2] px-3 py-2 text-sm text-[#1f6b42]">
                          {shareNotice}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleFavoriteRecipe(expandedRecipe.id)}
                        disabled={pendingFavoriteRecipeIds.has(
                          expandedRecipe.id
                        )}
                        aria-label={`Save ${expandedRecipe.name}`}
                        className={`inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                          favoriteRecipeIds.has(expandedRecipe.id)
                            ? 'text-[var(--theme-accent)]'
                            : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)]'
                        }`}
                      >
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                        {favoriteRecipeIds.has(expandedRecipe.id) ? 'Saved' : 'Save'}
                      </button>
                      <div className="relative" ref={shareMenuRef}>
                        <button
                          type="button"
                          onClick={() => void shareRecipe(expandedRecipe)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]"
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                          Share
                        </button>
                        {showShareMenu && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 shadow-cozy-lg">
                            <button
                              type="button"
                              onClick={() => void copyRecipeLink(getRecipeShareUrl(expandedRecipe))}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-bg-soft)]"
                            >
                              <Copy className="h-4 w-4" aria-hidden="true" />
                              Copy Link
                            </button>
                            <button
                              type="button"
                              onClick={() => openShareLink(getRecipeShareUrl(expandedRecipe), 'whatsapp')}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-bg-soft)]"
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden="true" />
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => openShareLink(getRecipeShareUrl(expandedRecipe), 'email')}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-bg-soft)]"
                            >
                              <Mail className="h-4 w-4" aria-hidden="true" />
                              Email
                            </button>
                            <button
                              type="button"
                              onClick={() => openShareLink(getRecipeShareUrl(expandedRecipe), 'telegram')}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-bg-soft)]"
                            >
                              <Send className="h-4 w-4" aria-hidden="true" />
                              Telegram
                            </button>
                          </div>
                        )}
                      </div>
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
                    <span>
                      {recipeSaves[expandedRecipe.id] ?? 0} saves
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {expandedRecipe.tags.map((tag) => {
                      const category = tagCategoryMap.get(tag.toLowerCase());
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-accent)] px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                        >
                          {tag}
                          {category && (
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none tracking-wide">
                              {category}
                            </span>
                          )}
                        </span>
                      );
                    })}
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

                  <section className="border-t border-[var(--theme-border)] pt-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--theme-text)] mb-3">
                      Comments ({(comments[expandedRecipe.id] || []).length})
                    </h4>

                    {isAuthenticated ? (
                      <>
                        {loadingComments ? (
                          <p className="text-sm text-[var(--theme-text-muted)] mb-4">Loading comments...</p>
                        ) : (comments[expandedRecipe.id] || []).length === 0 ? (
                          <p className="text-sm text-[var(--theme-text-muted)] mb-4">No comments yet. Be the first!</p>
                        ) : (() => {
                          const allComments = comments[expandedRecipe.id] || [];
                          const rootComments = allComments.filter((c) => !c.parentId);
                          const count = visibleCommentCount[expandedRecipe.id] || COMMENTS_PER_PAGE;
                          const visibleRoots = rootComments.slice(0, count);
                          const hasMore = count < rootComments.length;

                          return (
                            <>
                              <div className="space-y-3 mb-4">
                                {visibleRoots.map((comment) => (
                                  <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    replies={allComments.filter((r) => r.parentId === comment.id)}
                                    isReply={false}
                                    currentUserId={currentUserId}
                                    onReply={(id, author) => { setReplyingTo(id); setReplyingToAuthor(author || ''); setEditingCommentId(null); setTimeout(() => commentInputRef.current?.focus(), 50); }}
                                    onEdit={(id, content) => void editComment(id, expandedRecipe.id, content)}
                                    onDelete={(id) => void deleteComment(id, expandedRecipe.id)}
                                    replyingTo={replyingTo}
                                    editingCommentId={editingCommentId}
                                    setEditingCommentId={setEditingCommentId}
                                  />
                                ))}
                              </div>
                              {hasMore && (
                                <button
                                  onClick={() => {
                                    setVisibleCommentCount((prev) => ({
                                      ...prev,
                                      [expandedRecipe.id]: (prev[expandedRecipe.id] || COMMENTS_PER_PAGE) + COMMENTS_PER_PAGE,
                                    }));
                                  }}
                                  className="mb-4 w-full rounded border border-[var(--theme-border)] py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                                >
                                  Show more ({rootComments.length - count} remaining)
                                </button>
                              )}
                            </>
                          );
                        })()}

                        <div className="relative">
                          <div className="flex gap-2">
                            <input
                              ref={commentInputRef}
                              value={commentInput}
                              onChange={(e) => handleCommentInput(e.target.value)}
                              onKeyDown={handleCommentKeyDown}
                              placeholder={replyingTo ? `Replying to ${replyingToAuthor}...` : 'Add a comment...'}
                              className={`flex-1 rounded border px-3 py-2 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:ring-2 ${
                                replyingTo
                                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/5 ring-[var(--theme-focus)]'
                                  : 'border-[var(--theme-border)] bg-[var(--theme-surface-alt)] focus:border-[var(--theme-accent)] focus:ring-[var(--theme-focus)]'
                              }`}
                            />
                            <button
                              onClick={() => void addComment(expandedRecipe.id, replyingTo)}
                              disabled={!commentInput.trim()}
                              className="rounded bg-[var(--theme-accent)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--theme-accent-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {replyingTo ? 'Reply' : 'Post'}
                            </button>
                            {replyingTo && (
                              <button
                                onClick={() => { setReplyingTo(null); setReplyingToAuthor(''); setCommentInput(''); }}
                                className="rounded border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)]"
                              >
                                Cancel
                              </button>
                            )}
                          </div>

                          {showMentions && (() => {
                            const authors = getCommentAuthors().filter((a) =>
                              a.toLowerCase().includes(mentionQuery.toLowerCase())
                            );
                            if (!authors.length) return null;
                            return (
                              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-lg max-h-40 overflow-y-auto">
                                {authors.map((author, i) => (
                                  <button
                                    key={author}
                                    onClick={() => insertMention(author)}
                                    className={`w-full px-3 py-1.5 text-left text-sm transition ${
                                      i === mentionCursor
                                        ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]'
                                        : 'text-[var(--theme-text)] hover:bg-[var(--theme-surface-alt)]'
                                    }`}
                                  >
                                    <span className="font-medium text-[var(--theme-accent)]">@{author}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--theme-text-muted)]">
                        <button
                          onClick={onRequestAuth}
                          className="text-[var(--theme-accent)] hover:underline"
                        >
                          Log in
                        </button>{' '}
                        to join the conversation.
                      </p>
                    )}
                  </section>

                  {isAuthenticated &&
                    expandedRecipe.ownerId === currentUserId && (
                      <div className="flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            void startEditRecipe(
                              expandedRecipe.id,
                              expandedRecipe.ownerId
                            )
                          }
                          disabled={loadingEditRecipeId === expandedRecipe.id}
                          className="rounded-md border border-[var(--theme-border)] px-2.5 py-1 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)] disabled:opacity-60"
                        >
                          {loadingEditRecipeId === expandedRecipe.id
                            ? 'Opening...'
                            : 'Edit'}
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
                          className={`rounded-md px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-60 ${
                            armedDeleteRecipeIds.has(expandedRecipe.id)
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-[var(--theme-text-muted)] hover:bg-red-600'
                          }`}
                        >
                          {deletingRecipeIds.has(expandedRecipe.id)
                            ? 'Deleting...'
                            : armedDeleteRecipeIds.has(expandedRecipe.id)
                              ? 'Delete permanently'
                              : 'Delete'}
                        </button>
                      </div>
                    )}
                </div>
              </article>
) : null;

  return (
    <main className="flex h-screen flex-col overflow-x-hidden overflow-y-hidden bg-[var(--theme-bg)]">
      {profileSetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-cozy-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-accent)]">Welcome aboard</p>
            <h3 className="mt-2 font-heading text-xl font-semibold text-[var(--theme-text)]">Pick your public identity</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">Choose a display name and handle so other cooks can find your recipes and profile.</p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Display name</span>
                <input
                  value={displayNameDraft}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  placeholder="How you want to be known"
                  className="ak-input rounded px-3 py-2 text-sm outline-none transition"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">Username</span>
                <input
                  value={usernameDraft}
                  onChange={(event) => setUsernameDraft(event.target.value)}
                  placeholder="your-handle"
                  className="ak-input rounded px-3 py-2 text-sm outline-none transition"
                />
                {usernameError && <p className="text-xs text-red-600">{usernameError}</p>}
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileSetupOpen(false)}
                className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)]"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => void saveUsernameSetup()}
                disabled={usernameSavePending}
                className="rounded-lg bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--theme-accent-strong)] disabled:opacity-60"
              >
                {usernameSavePending ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[var(--theme-accent)]/[0.02] to-transparent" />
      <header className="sticky top-0 z-20 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/92 backdrop-blur-xl overflow-visible">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-1 lg:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('Discover')}
                className="rounded-md p-0.5 transition active:scale-90 mt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
                aria-label="Home"
              >
                <img
                  src="/logo-no-background.svg"
                  alt=""
                  draggable={false}
                  className="h-14 w-14 object-contain brightness-[0.3] pointer-events-none"
                />
              </button>
              <span className="font-heading text-base font-semibold text-[var(--theme-text)] select-none">
                Arcane Kitchen
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setCurrentView('Discover')}
                className={`rounded-md px-2 py-1 text-sm font-medium transition ${
                  currentView === 'Discover'
                    ? 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]'
                    : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]'
                }`}
              >
                Discover
              </button>
              <button
                onClick={startCreateRecipe}
                className={`rounded-md px-2 py-1 text-sm font-medium transition ${
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
              <div ref={menuContainerRef} className="relative">
                <button
                  onClick={() => setShowUserMenu((p) => !p)}
                  className="group flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[var(--theme-surface-alt)]"
                >
                  <div className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-accent)] text-xs font-semibold text-white transition-transform duration-300 ${showUserMenu ? 'scale-150' : ''} group-hover:scale-150`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      creatorName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className={`max-w-[100px] truncate text-sm font-medium text-[var(--theme-text)] transition-all duration-300 ${showUserMenu ? 'translate-x-1 text-[var(--theme-accent)]' : ''} group-hover:translate-x-1 group-hover:text-[var(--theme-accent)]`}>
                    {creatorName}
                  </span>
                  <svg className={`h-4 w-4 text-[var(--theme-text-muted)] transition ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
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
                      <button
                        onClick={() => {
                          setExpandedRecipeId(null);
                          if (typeof window !== 'undefined') {
                            window.history.replaceState({}, '', '/');
                          }
                          setCurrentView('SavedRecipes');
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                      >
                        <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0110.186 0z" />
                        </svg>
                        Saved Recipes
                      </button>
                      <button
                        onClick={() => {
                          setExpandedRecipeId(null);
                          if (typeof window !== 'undefined') {
                            window.history.replaceState({}, '', '/');
                          }
                          setCurrentView('Drafts');
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                      >
                        <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Drafts
                      </button>
                      <div className="my-1 border-t border-[var(--theme-border)]" />
                      <a
                        href="https://x.com/ElevatorRobot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                      >
                        <svg className="h-4 w-4 text-[var(--theme-text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Feedback & Support
                      </a>
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
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
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
                <div className="flex gap-3">
                  <div className="relative flex-1 sm:flex-none sm:min-w-[140px]">
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
            </div>

            <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {['All', 'Favorites', 'My recipes'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? 'All' : tag)}
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
                            onClick={() => setActiveTag(activeTag === label ? 'All' : label)}
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
                                      setActiveTag(activeTag === label ? 'All' : label);
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
                            onClick={() => setActiveTag(activeTag === label ? 'All' : label)}
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
            ) : expandedRecipeMessage && !expandedRecipe ? (
              <div className="mt-12 rounded-xl border border-dashed border-[var(--theme-border)] p-10 text-center">
                <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                  {expandedRecipeMessage}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                  The shared recipe may have been removed or the link may be invalid.
                </p>
              </div>
            ) : visibleFeedRecipes.length ? (
              <>
                {discoverQuery.trim() && (
                  <div className="mb-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/50 px-4 py-3 text-sm text-[var(--theme-text-muted)]">
                    We couldn't find exactly what you're looking for.
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleFeedRecipes.map((recipe) => (
                    <FeedRecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      isFavorited={favoriteRecipeIds.has(recipe.id)}
                      isPendingFavorite={pendingFavoriteRecipeIds.has(recipe.id)}
                      saveCount={recipeSaves[recipe.id] ?? 0}
                      onOpenRecipe={expandRecipe}
                      onToggleFavorite={toggleFavoriteRecipe}
                      onEditRecipe={startEditRecipe}
                      onDeleteRecipe={deleteRecipe}
                      loadingEditRecipeId={loadingEditRecipeId}
                      deletingRecipeIds={deletingRecipeIds}
                      armedDeleteRecipeIds={armedDeleteRecipeIds}
                      currentUserId={currentUserId}
                      isAuthenticated={isAuthenticated}
                      onOpenProfile={openProfileRoute}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-12 rounded-xl border border-dashed border-[var(--theme-border)] p-10 text-center">
                <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                  We couldn't find exactly what you're looking for.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                  {isAuthenticated
                    ? 'Try another ingredient, tag, recipe title, or author.'
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
                className="ak-input rounded px-3 py-2 outline-none transition"
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
                className="ak-input h-20 resize-none rounded px-3 py-2 outline-none transition"
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
                className="ak-input h-20 resize-none rounded px-3 py-2 outline-none transition"
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
                    className="ak-input rounded px-3 py-2 text-sm outline-none w-full"
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
                    className="ak-surface-alt grid min-w-0 gap-2 rounded border p-2"
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
                        className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
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
                        className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
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
                        className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
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
                      className="ak-input h-16 resize-none rounded px-3 py-2 text-sm outline-none transition"
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
                    className="ak-surface-alt grid min-w-0 grid-cols-[1fr_auto] gap-2 rounded border p-3"
                  >
                    <input
                      aria-label="Utensil"
                      value={utensil}
                      onChange={(event) =>
                        updateUtensil(index, event.target.value)
                      }
                      placeholder="e.g., Mixing bowl, Chef's knife"
                      className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
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
          id="saved-recipes"
          key={currentView === 'SavedRecipes' ? 'saved-recipes-visible' : 'saved-recipes-hidden'}
          className={`min-h-0 overflow-y-auto ${
            currentView === 'SavedRecipes' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-[var(--theme-text)]">Saved recipes</h2>
                <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                  Recipes you've bookmarked from the shared feed.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('Discover')}
                className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
              >
                Back to Discover
              </button>
            </div>

            {savedRecipes.length ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {savedRecipes.map((recipe) => (
                  <FeedRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorited={favoriteRecipeIds.has(recipe.id)}
                    isPendingFavorite={pendingFavoriteRecipeIds.has(recipe.id)}
                    saveCount={recipeSaves[recipe.id] ?? 0}
                    onOpenRecipe={(selectedRecipe) => {
                      void expandRecipe(selectedRecipe);
                    }}
                    onToggleFavorite={toggleFavoriteRecipe}
                    onEditRecipe={startEditRecipe}
                    onDeleteRecipe={deleteRecipe}
                    loadingEditRecipeId={loadingEditRecipeId}
                    deletingRecipeIds={deletingRecipeIds}
                    armedDeleteRecipeIds={armedDeleteRecipeIds}
                    currentUserId={currentUserId}
                    isAuthenticated={isAuthenticated}
                    onOpenProfile={openProfileRoute}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-xl border border-dashed border-[var(--theme-border)] p-10 text-center">
                <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                  No saved recipes yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                  Save recipes from Discover to keep them close at hand here.
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          id="drafts"
          key={currentView === 'Drafts' ? 'drafts-visible' : 'drafts-hidden'}
          className={`min-h-0 overflow-y-auto ${
            currentView === 'Drafts' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                  Drafts
                </h2>
                <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                  Continue recipes you were already building.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('Discover')}
                className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
              >
                Back to Discover
              </button>
            </div>

            {draftRecords.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {draftRecords.map((draftRecord) => (
                  <article
                    key={draftRecord.id}
                    className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-accent)]">
                          Draft
                        </p>
                        <h3 className="mt-2 font-heading text-lg font-semibold text-[var(--theme-text)]">
                          {draftRecord.title}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                          Last modified {dayjs(draftRecord.updatedAt).format('MMM D, YYYY h:mm A')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeDraftRecord(draftRecord)}
                        className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => resumeDraft(draftRecord)}
                        className="rounded-lg bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--theme-accent-strong)]"
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeDraftRecord(draftRecord)}
                        className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                      >
                        Delete draft
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-xl border border-dashed border-[var(--theme-border)] p-10 text-center">
                <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                  No drafts yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                  Start a recipe in Build and it will be saved here automatically.
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          id="profile"
          key={currentView === 'Profile' ? 'profile-visible' : 'profile-hidden'}
          className={`min-h-0 overflow-y-auto ${
            currentView === 'Profile' ? 'flex flex-col' : 'hidden'
          }`}
        >
          {profileRouteProfile ? (
            <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-[var(--theme-accent)] text-3xl font-bold text-white sm:h-32 sm:w-32">
                  {(selectedAvatar || effectiveAvatar || profileRouteProfile.avatar) ? (
                    <img src={avatarEntries.find((e) => e.file === (selectedAvatar || effectiveAvatar || profileRouteProfile.avatar))?.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    (profileRouteProfile.displayName || profileRouteProfile.username || 'C').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-2xl font-semibold text-[var(--theme-text)]">
                    {profileRouteProfile.displayName || 'Cook'}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                    @{profileRouteProfile.username}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[var(--theme-surface-alt)] px-3 py-1 text-xs font-medium text-[var(--theme-text-muted)]">
                      {feedRecipes.filter((recipe) => recipe.ownerId === profileRouteProfile.userId).length} published recipes
                    </span>
                    {currentUserId === profileRouteProfile.userId && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProfileUsername(null);
                          setCurrentView('Profile');
                        }}
                        className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm font-medium text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                      >
                        Edit Profile
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void shareProfile(profileRouteProfile.username)}
                      className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm font-medium text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]"
                    >
                      Share Profile
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold text-[var(--theme-text)]">
                    Published recipes
                  </h3>
                  <span className="text-sm text-[var(--theme-text-muted)]">
                    {feedRecipes.filter((recipe) => recipe.ownerId === profileRouteProfile.userId).length}
                  </span>
                </div>

                {(() => {
                  const authorRecipes = [...feedRecipes]
                    .filter((recipe) => recipe.ownerId === profileRouteProfile.userId)
                    .sort((left, right) => {
                      const leftTime = left.createdAt ? dayjs(left.createdAt).valueOf() : 0;
                      const rightTime = right.createdAt ? dayjs(right.createdAt).valueOf() : 0;
                      return rightTime - leftTime;
                    });

                  if (!authorRecipes.length) {
                    return (
                      <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm text-[var(--theme-text-muted)]">
                        No published recipes yet.
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {authorRecipes.map((recipe) => (
                        <FeedRecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          isFavorited={favoriteRecipeIds.has(recipe.id)}
                          isPendingFavorite={pendingFavoriteRecipeIds.has(recipe.id)}
                          saveCount={recipeSaves[recipe.id] ?? 0}
                          onOpenRecipe={expandRecipe}
                          onToggleFavorite={toggleFavoriteRecipe}
                          onEditRecipe={startEditRecipe}
                          onDeleteRecipe={deleteRecipe}
                          loadingEditRecipeId={loadingEditRecipeId}
                          deletingRecipeIds={deletingRecipeIds}
                          armedDeleteRecipeIds={armedDeleteRecipeIds}
                          currentUserId={currentUserId}
                          isAuthenticated={isAuthenticated}
                          onOpenProfile={openProfileRoute}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : isViewingExternalProfile ? (
            <div className="mx-auto w-full max-w-4xl p-8 text-center">
              <p className="font-heading text-2xl font-semibold text-[var(--theme-text)]">
                Profile not found
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">
                We couldn’t locate that creator profile. Try checking a different profile link.
              </p>
            </div>
          ) : (
            <UserProfileView
              user={profileViewUser}
              publishedRecipes={feedRecipes
                .filter((r) => r.ownerId === currentUserId)
                .map((r) => ({
                  id: r.id,
                  title: r.name,
                  time: r.time,
                  image: r.image,
                  likes: 0,
                  saves: Number(r.saves) || 0,
                }))}
              draftRecipes={draftRecords
                .filter((d) => d.ownerId === currentUserId)
                .map((d) => ({
                  id: d.id,
                  title: d.title || d.draft?.name || 'Untitled',
                  lastEdited: d.updatedAt
                    ? new Date(d.updatedAt).toLocaleDateString()
                    : undefined,
                  image: d.imageDataUrl || neutralImagePlaceholder,
                }))}
              savedRecipes={savedRecipes.map((r) => ({
                id: r.id,
                title: r.name,
                time: r.time,
                image: r.image,
                likes: 0,
                saves: Number(r.saves) || 0,
              }))}
              onAvatarUpload={(file?: File) => updateImageFile(file)}
              onSelectPreset={handleSelectAvatarPreset}
              onNewRecipe={startCreateRecipe}
              onOpenRecipe={(recipeId: string | number) => {
                const recipe = feedRecipes.find((r) => r.id === String(recipeId));
                if (recipe) void expandRecipe(recipe, { stayInView: true });
              }}
              onRecipeOptions={(recipeId: string | number) => {
                void startEditRecipe(String(recipeId), currentUserId || '');
              }}
              onProfileUpdated={({ name, handle, bio }) => {
                // optimistic update of profile in-memory and persist
                const uid = currentUserId || 'current';
                const profiles = loadUserProfiles();
                const updated = upsertUserProfile(profiles, {
                  userId: uid,
                  displayName: name,
                  username: handle,
                  bio,
                });
                saveUserProfiles(updated);
                void syncUserProfilesToBackend(updated, client);
                void syncProfileToCognito({
                  displayName: name,
                  bio,
                });

                // update local UI pieces
                setProfileData(updated[uid]);
                // update profileViewUser via state dependencies by touching profileData
                onProfileSaved?.();
              }}
            />
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (draftId && currentUserId) {
                          void deleteRecipeDraft(currentUserId, draftId);
                        }
                        setDraft(EMPTY_RECIPE_DRAFT);
                        setDraftId(null);
                        setDraftImageDataUrl(null);
                        setEditingRecipeId(null);
                        setSelectedImageFile(null);
                        setImagePreviewUrl(neutralImagePlaceholder);
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
                      className="rounded-md border border-[var(--theme-border)] px-2.5 py-1 text-xs font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)] disabled:opacity-60"
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
                    className="group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-alt)] transition-all hover:border-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
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

      {expandedRecipe && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[var(--theme-overlay)] backdrop-blur-sm"
          onClick={collapseExpandedRecipe}
        >
          <button
            type="button"
            onClick={collapseExpandedRecipe}
            aria-label="Close recipe"
            className="fixed right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div
            className="mx-auto my-8 w-full max-w-4xl px-4 sm:px-6"
            onClick={(event) => event.stopPropagation()}
          >
            {expandedRecipeArticle}
          </div>
        </div>
      )}
    </main>
  );
};

export default RecipeBuilder;
