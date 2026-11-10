import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { client } from '../dataClient';
import { uploadData } from 'aws-amplify/storage';
import {
  ArrowDownUp,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Heart,
  Maximize2,
  Plus,
  Search,
  Share,
  Sparkles,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { getRecipeImageSource } from '../utils/recipeImages';
import { randomMerlinColor } from '../theme/merlinPalette';
import {
  deleteRecipeDraft,
  EMPTY_RECIPE_DRAFT,
  isRecipeDraftEmpty,
  loadRecipeDraftsForOwner,
  saveRecipeDraft,
  type RecipeDraft,
  type RecipeIngredientDraft,
} from '../utils/recipeDrafts';
import {
  buildSuggestedUsername,
  findProfileByUsername,
  getDisplayNameFromAuth,
  getProfileRoutePath,
  randomDefaultAvatar,
  getProfileUsernameFromPath,
  getRecipeIdFromPath,
  getRecipeRoutePath,
  getUsernameFromAuth,
  getUserProfileByUsername,
  indexUserProfiles,
  isUsernameTakenServerSide,
  listUserProfilesFromBackend,
  loadUserProfiles,
  saveUserProfiles,
  saveKitchenIdentityToBackend,
  sanitizeUsername,
  syncUserProfilesToBackend,
  upsertUserProfile,
  validateProfileIdentity,
  type UserProfile,
} from '../utils/userProfiles';
import UserProfileView from './UserProfileView';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceFooter from './WorkspaceFooter';
import RecipeTagFilters from './RecipeTagFilters';
import CommunityHearth, { type FeaturedRecipeSummary } from './CommunityHearth';
import { readFeaturedRecipe } from '../utils/featuredRecipe';
import RecipeCookingGuide from './RecipeCookingGuide';
import RecipeReadiness from './RecipeReadiness';
import RecipeImage from './ui/RecipeImage';
import CookAvatar from './ui/CookAvatar';
import { formatRecipeTime } from '../utils/recipeDisplay';
import { isMockPreview } from '../preview/config';
import Button from './ui/Button';
import ProfileSkeleton from './profile/ProfileSkeleton';
import PageBanner from './ui/PageBanner';
import {
  loadDiscoverPreferences,
  saveDiscoverPreferences,
} from '../utils/discoverPreferences';
import AccessibleDialog from './AccessibleDialog';
import ErrorArtwork from './ErrorArtwork';
import SanctuaryHeading from './ui/SanctuaryHeading';
import SanctuaryMotif from './ui/SanctuaryMotif';
import {
  sanctuaryBackground,
  sanctuaryThemeStyle,
} from '../theme/sanctuaryTheme';
import {
  kitchenCalling,
  normalizeKitchenIdentity,
  type KitchenIdentity,
} from '../utils/kitchenIdentity';
import { syncProfileToCognito } from '../utils/cognitoProfileSync';
import { getUserFacingErrorMessage } from '../utils/userFacingErrors';

const doUploadData = uploadData;
const RECIPE_BUILDER_FAVORITES_KEY = 'arcaneKitchen.favoriteRecipeIds';
type RecipeBuilderView = 'Discover' | 'Build' | 'Profile' | 'SavedRecipes';

const viewForPath = (pathname: string): RecipeBuilderView => {
  if (pathname.startsWith('/discover')) return 'Discover';
  if (pathname.startsWith('/build') || /^\/drafts\/?$/.test(pathname))
    return 'Build';
  if (pathname.startsWith('/saved')) return 'SavedRecipes';
  if (pathname.startsWith('/u/') || pathname.startsWith('/profile/')) {
    return 'Profile';
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
  // Owner authorization uses the Cognito subject, never the login username.
  currentUser?.userId || userAttributes?.sub || currentUser?.username || null;

interface RecipeBuilderProps {
  isAuthenticated: boolean;
  isAdmin?: boolean;
  currentUser: any;
  userAttributes?: any;
  onRequestAuth?: () => void;
  onSignOut?: () => void | Promise<void>;
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
  authorAvatar?: string;
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
  onOpenProfile?: (username: string) => void;
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
  onOpenProfile,
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
        <button
          key={i}
          type="button"
          onClick={() => onOpenProfile?.(part.slice(1))}
          className="font-semibold text-[var(--theme-accent)] hover:underline"
        >
          {part}
        </button>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div>
      <div
        className={`rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 ${isReply ? 'ml-4 border-l-2 border-l-[var(--theme-border)] border-t-0 border-r-0 border-b-0 rounded-none' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {comment.author.startsWith('@') ? (
              <button
                type="button"
                onClick={() =>
                  onOpenProfile?.(sanitizeUsername(comment.author))
                }
                className="text-sm font-medium text-[var(--theme-text)] hover:text-[var(--theme-accent)] hover:underline"
              >
                {sanitizeUsername(comment.author)}
              </button>
            ) : (
              <span className="text-sm font-medium text-[var(--theme-text)]">
                {comment.author}
              </span>
            )}
            <span className="ml-2 text-xs text-[var(--theme-text-muted)]">
              {timeAgo(comment.createdAt)}
              {comment.updatedAt && (
                <span className="ml-1 italic">(edited)</span>
              )}
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
                className="ak-button-ghost rounded-lg px-2 py-1.5 text-xs"
              >
                {editingCommentId === comment.id ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="ak-button-danger-soft rounded-lg px-2 py-1.5 text-xs"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {editingCommentId === comment.id ? (
          <div className="mt-2 flex gap-2">
            <input
              aria-label="Edit comment"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="ak-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={() => onEdit(comment.id, editValue)}
              disabled={!editValue.trim()}
              className="ak-button-primary rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="mt-2 break-words text-sm leading-6 text-[var(--theme-text)] whitespace-pre-wrap">
            {renderContent(comment.content)}
          </p>
        )}
        {!isReply && (
          <div className="mt-1.5 flex gap-2">
            <button
              onClick={() => onReply(comment.id, comment.author)}
              className="ak-button-ghost rounded-lg px-3 py-1.5 text-xs"
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
              onOpenProfile={onOpenProfile}
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
    className="ak-recipe-card ak-feed-card group cursor-pointer overflow-hidden"
    onClick={() => void onOpenRecipe(recipe)}
  >
    <div className="ak-recipe-media ak-feed-photo relative overflow-hidden">
      <RecipeImage
        src={recipe.image}
        alt={recipe.name}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
      />
      <div className="ak-photo-caption">
        {recipe.tags[0] && (
          <span className="ak-photo-tag">{recipe.tags[0]}</span>
        )}
        {recipe.rating !== 'New' && (
          <div className="ak-photo-tag">{recipe.rating}</div>
        )}
      </div>
    </div>
    <div className="ak-feed-card-body">
      <div className="ak-card-byline">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (recipe.authorHandle) onOpenProfile?.(recipe.authorHandle);
          }}
          className="ak-author-link"
        >
          <CookAvatar name={recipe.author} avatar={recipe.authorAvatar} />
          <span>by {recipe.author}</span>
        </button>
        <ArrowUpRight size={17} className="ak-card-open" aria-hidden="true" />
      </div>
      <h3 className="ak-feed-title">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void onOpenRecipe(recipe);
          }}
          className="text-left hover:text-[var(--theme-accent)]"
        >
          {recipe.name}
        </button>
      </h3>
      <p className="ak-card-description line-clamp-2">{recipe.description}</p>
      <div className="ak-card-footer">
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} aria-hidden="true" />
          {formatRecipeTime(recipe.time)}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onToggleFavorite(recipe.id);
            }}
            disabled={isPendingFavorite}
            aria-pressed={isFavorited}
            aria-label={
              isFavorited ? `Unsave ${recipe.name}` : `Save ${recipe.name}`
            }
            className="ak-card-save ak-button-save inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorited ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
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
            className="ak-button-secondary rounded-lg px-3 py-2 text-xs disabled:opacity-60"
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
            className={`rounded-lg px-3 py-2 text-xs disabled:opacity-60 ${armedDeleteRecipeIds?.has(recipe.id) ? 'ak-button-danger' : 'ak-button-danger-soft'}`}
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
const isPlaceholder = (src: string) =>
  src === IMAGE_PLACEHOLDER || src === neutralImagePlaceholder;

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
  utensils: ['Cutting board', "Chef's knife", 'Mixing bowl'],
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
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Low-Carb',
    'Nut-Free',
    'Whole30',
    'Sugar-Free',
  ],
  'Meal Type': [
    'Breakfast',
    'Lunch',
    'Dinner',
    'Dessert',
    'Snack',
    'Appetizer',
    'Brunch',
    'Side',
  ],
  Cuisine: [
    'Italian',
    'Mexican',
    'Thai',
    'Japanese',
    'Indian',
    'Mediterranean',
    'Chinese',
    'French',
    'American',
    'Korean',
    'Middle Eastern',
    'Vietnamese',
  ],
  Season: ['Spring', 'Summer', 'Fall', 'Winter'],
  Difficulty: ['Easy', 'Medium', 'Hard'],
};

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
  isMockPreview ||
  Boolean((Amplify.getConfig() as { Storage?: unknown }).Storage);

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
  isAdmin = false,
  currentUser,
  userAttributes,
  onRequestAuth,
  onSignOut,
  onProfileSaved,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedProfileUsername = getProfileUsernameFromPath(
    location.pathname
  );
  const requestedProfileKey =
    requestedProfileUsername === null
      ? null
      : sanitizeUsername(requestedProfileUsername);
  const isTabLocked = (tab: RecipeBuilderView) =>
    !isAuthenticated && tab === 'Build';
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_RECIPE_DRAFT);
  const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>([]);
  const [adminRevision, setAdminRevision] = useState(0);
  const [featuredRecipe, setFeaturedRecipe] = useState<
    (FeaturedRecipeSummary & { ownerId: string }) | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const recipe = await readFeaturedRecipe(client, isAuthenticated);
        const next = recipe
          ? {
              id: recipe.id,
              name: recipe.name,
              description: recipe.description || '',
              image: await getRecipeImageSource(recipe.imageUrl),
              time: recipe.prepTime || '',
              ownerId: recipe.ownerId,
              author: recipe.createdBy || 'Arcane cook',
            }
          : null;
        if (!cancelled) setFeaturedRecipe(next);
      } catch (error) {
        console.error('Failed to load featured recipe:', error);
        if (!cancelled) setFeaturedRecipe(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, adminRevision]);
  const [feedError, setFeedError] = useState('');
  const [initialDiscoverPreferences] = useState(loadDiscoverPreferences);
  const [activeTags, setActiveTags] = useState<Map<string, string>>(
    () => new Map(initialDiscoverPreferences.tags)
  );
  const [activeAuthor, setActiveAuthor] = useState<string | null>(
    initialDiscoverPreferences.author
  );
  const handleFilterClick = useCallback((tag: string) => {
    const key = normalizeTag(tag).toLowerCase();
    const color = randomMerlinColor();
    setActiveTags((previous) => {
      const next = new Map(previous);
      if (next.has(key)) next.delete(key);
      else next.set(key, color);
      return next;
    });
  }, []);
  const [discoverQuery, setDiscoverQuery] = useState(
    initialDiscoverPreferences.query
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialDiscoverPreferences.sort
  );
  useEffect(() => {
    saveDiscoverPreferences({
      query: discoverQuery,
      sort: sortOrder,
      author: activeAuthor,
      tags: [...activeTags],
    });
  }, [discoverQuery, sortOrder, activeAuthor, activeTags]);
  const [currentView, setCurrentView] = useState<RecipeBuilderView>(() =>
    viewForPath(location.pathname)
  );
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const feedLoadRequestRef = useRef(0);
  const feedHasSettledRef = useRef(false);
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
  const [recipeShareCopied, setRecipeShareCopied] = useState(false);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    getInitialFavoriteRecipeIds
  );
  const [pendingFavoriteRecipeIds, setPendingFavoriteRecipeIds] = useState<
    Set<string>
  >(() => new Set());
  const [recipeSaves, setRecipeSaves] = useState<Record<string, number>>({});
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const justClosedRecipeIdRef = useRef<string | null>(null);
  const [expandedRecipeIngredients, setExpandedRecipeIngredients] = useState<
    Record<string, string[]>
  >({});
  const [loadingExpandedRecipeId, setLoadingExpandedRecipeId] = useState<
    string | null
  >(null);
  const [expandedRecipeMessage, setExpandedRecipeMessage] = useState('');
  const [comments, setComments] = useState<
    Record<
      string,
      Array<{
        id: string;
        recipeId: string;
        userId: string;
        author: string;
        content: string;
        parentId: string | null;
        createdAt: string;
        updatedAt?: string;
      }>
    >
  >({});
  const [visibleCommentCount, setVisibleCommentCount] = useState<
    Record<string, number>
  >({});
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
  const [showRecipeImageLightbox, setShowRecipeImageLightbox] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftImageDataUrl, setDraftImageDataUrl] = useState<string | null>(
    null
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(
    neutralImagePlaceholder
  );
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSavePending, setUsernameSavePending] = useState(false);
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const draftAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [draftHydrated, setDraftHydrated] = useState(false);
  const tagColorsRef = useRef<Record<string, string>>({});
  const getTagColor = (tag: string) => {
    const key = tag.trim().toLowerCase();
    if (!tagColorsRef.current[key]) {
      tagColorsRef.current[key] = randomMerlinColor();
    }
    return tagColorsRef.current[key];
  };

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
    } catch {
      /* ignore */
    }
    return null;
  }, [PROFILE_CACHE_KEY]);

  const profileAvatar =
    userAttributes?.['custom:avatar'] || cachedProfile?.avatar || null;
  const profileBio = userAttributes?.['custom:bio'] ?? cachedProfile?.bio ?? '';
  const localProfiles = useMemo(
    () => loadUserProfiles(),
    [currentUserId, profileData]
  );
  const activeProfile = currentUserId ? localProfiles[currentUserId] : null;
  const activeUsername =
    activeProfile?.username ||
    getUsernameFromAuth(currentUser, userAttributes) ||
    sanitizeUsername(getDisplayNameFromAuth(currentUser, userAttributes));
  // Prefer the freshly saved local profile value for display. userAttributes
  // only refresh at sign-in, so a Cognito avatar would otherwise shadow any
  // change made during the session.
  const effectiveAvatar = activeProfile?.avatar || profileAvatar || null;

  // Backend is the source of truth for public profiles; localStorage is only a
  // cache/fallback. These maps hydrate author attribution on recipe cards and
  // resolve /u/:username (public profiles) for any visitor.
  const [backendProfilesByUserId, setBackendProfilesByUserId] = useState<
    Record<string, UserProfile>
  >({});
  const [backendProfilesByUsername, setBackendProfilesByUsername] = useState<
    Record<string, UserProfile>
  >({});
  const backendProfilesByUsernameRef = useRef(backendProfilesByUsername);
  backendProfilesByUsernameRef.current = backendProfilesByUsername;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const profiles = await listUserProfilesFromBackend(
        client,
        isAuthenticated ? 'userPool' : 'identityPool'
      );
      if (cancelled) return;
      const { byUserId, byUsername } = indexUserProfiles(profiles);
      setBackendProfilesByUserId(byUserId);
      setBackendProfilesByUsername(byUsername);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profileData, adminRevision]);

  // Refetch the single requested profile from the backend when the route
  // changes, so a shared /u/:handle link resolves on any device. Falls back to
  // the cached maps for the current session and to localStorage for the signed
  // in user's own handle.
  const [profileRouteProfile, setProfileRouteProfile] =
    useState<UserProfile | null>(() =>
      requestedProfileKey
        ? findProfileByUsername(localProfiles, requestedProfileKey)
        : null
    );
  const [profileRouteUsername, setProfileRouteUsername] = useState<
    string | null
  >(requestedProfileKey);
  const [isProfileRouteLoading, setIsProfileRouteLoading] = useState(
    Boolean(requestedProfileKey)
  );
  useEffect(() => {
    if (!requestedProfileKey) {
      setProfileRouteProfile(null);
      setProfileRouteUsername(null);
      setIsProfileRouteLoading(false);
      return;
    }
    const normalized = requestedProfileKey;
    if (!normalized) {
      setProfileRouteProfile(null);
      setProfileRouteUsername(null);
      setIsProfileRouteLoading(false);
      return;
    }
    setProfileRouteUsername(normalized);
    const cached =
      backendProfilesByUsernameRef.current[sanitizeUsername(normalized)] ||
      findProfileByUsername(localProfiles, normalized) ||
      null;
    setProfileRouteProfile(
      (previous) =>
        cached ||
        (previous && sanitizeUsername(previous.username) === normalized
          ? previous
          : null)
    );
    setIsProfileRouteLoading(true);
    let cancelled = false;
    void getUserProfileByUsername(
      normalized,
      client,
      isAuthenticated ? 'userPool' : 'identityPool'
    ).then((profile) => {
      if (cancelled) return;
      setProfileRouteProfile(profile);
      setIsProfileRouteLoading(false);
      if (profile) {
        setBackendProfilesByUsername((previous) => ({
          ...previous,
          [sanitizeUsername(profile.username)]: profile,
        }));
        setBackendProfilesByUserId((previous) => ({
          ...previous,
          [String(profile.userId)]: profile,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [requestedProfileKey, localProfiles, isAuthenticated]);

  const isViewingExternalProfile =
    currentView === 'Profile' &&
    requestedProfileKey !== null &&
    profileRouteUsername === requestedProfileKey &&
    profileRouteProfile !== null &&
    String(profileRouteProfile.userId) !== String(currentUserId);
  const isViewingOwnProfile =
    isAuthenticated &&
    Boolean(activeProfile) &&
    currentView === 'Profile' &&
    requestedProfileKey !== null &&
    requestedProfileKey === sanitizeUsername(activeUsername);
  const creatorName = activeUsername ? `@${activeUsername}` : 'Guest cook';

  // Repair legacy records and keep the denormalized author label aligned with
  // the owner handle whenever the current user's profile is loaded or renamed.
  const syncedCreatorNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !currentUserId ||
      !activeUsername ||
      syncedCreatorNameRef.current === creatorName
    ) {
      return;
    }
    syncedCreatorNameRef.current = creatorName;
    void (async () => {
      const result = await client.models.Recipe.list({
        filter: { ownerId: { eq: currentUserId } },
        authMode: 'userPool',
      });
      if (result.errors?.length) return;
      await Promise.all(
        result.data
          .filter((recipe: any) => recipe.createdBy !== creatorName)
          .map((recipe: any) =>
            client.models.Recipe.update(
              { id: recipe.id, createdBy: creatorName },
              { authMode: 'userPool' }
            )
          )
      );
    })().catch((error) =>
      console.error('Failed to synchronize recipe authors:', error)
    );
  }, [currentUserId, activeUsername, creatorName]);

  const avatarEntries = useMemo(
    () =>
      Object.entries(
        import.meta.glob<{ default: string }>('/src/assets/avatars/*.webp', {
          eager: true,
        })
      ).map(([path, mod]) => ({
        file: path.split('/').pop()!,
        url: mod.default,
      })),
    []
  );

  const avatarUrl = effectiveAvatar
    ? avatarEntries.find((e) => e.file === effectiveAvatar)?.url || null
    : null;

  const dismissExpandedRecipe = useCallback(() => {
    justClosedRecipeIdRef.current = expandedRecipeId;
    setShowRecipeImageLightbox(false);
    setExpandedRecipeId(null);
    setExpandedRecipeMessage('');
    setComments((previous) => {
      if (!expandedRecipeId) return previous;
      const next = { ...previous };
      delete next[expandedRecipeId];
      return next;
    });
    setVisibleCommentCount((previous) => {
      if (!expandedRecipeId) return previous;
      const next = { ...previous };
      delete next[expandedRecipeId];
      return next;
    });
    setReplyingTo(null);
    setReplyingToAuthor('');
    setEditingCommentId(null);
    setCommentInput('');
    setShowMentions(false);
    setMentionQuery('');
    setMentionCursor(0);
  }, [expandedRecipeId]);

  const selectAuthorFilter = useCallback(
    (username: string) => {
      const normalized = sanitizeUsername(username);
      if (!normalized) return;

      dismissExpandedRecipe();
      setActiveAuthor(normalized);
      setActiveTags(new Map());
      setCurrentView('Discover');
      navigate('/discover');
    },
    [dismissExpandedRecipe, navigate]
  );

  const openProfilePage = useCallback(
    (username: string) => {
      const normalized = sanitizeUsername(username);
      if (!normalized) return;
      dismissExpandedRecipe();
      navigate(getProfileRoutePath(normalized));
    },
    [dismissExpandedRecipe, navigate]
  );

  useEffect(() => {
    if (!currentUserId) {
      setDraftId(null);
      setDraftImageDataUrl(null);
      setDraft(EMPTY_RECIPE_DRAFT);
      setEditingRecipeId(null);
      setImagePreviewUrl(neutralImagePlaceholder);
      setSelectedImageFile(null);
      setDraftHydrated(true);
      return;
    }

    let cancelled = false;
    setDraftHydrated(false);

    const hydrateDrafts = async () => {
      const records = await loadRecipeDraftsForOwner(currentUserId);

      if (cancelled) return;

      const latest = records[0];
      setDraft(latest?.draft || EMPTY_RECIPE_DRAFT);
      setDraftId(latest?.id || null);
      setDraftImageDataUrl(latest?.imageDataUrl || null);
      setEditingRecipeId(latest?.editingRecipeId || null);
      setImagePreviewUrl(latest?.imageDataUrl || neutralImagePlaceholder);
      setSelectedImageFile(
        latest?.imageDataUrl
          ? dataUrlToFile(latest.imageDataUrl, 'recipe-image.jpg')
          : null
      );
      setDraftHydrated(true);
    };

    void hydrateDrafts().catch((error) => {
      if (cancelled) return;
      console.error('Failed to restore unfinished recipe:', error);
      setDraft(EMPTY_RECIPE_DRAFT);
      setDraftId(null);
      setDraftImageDataUrl(null);
      setEditingRecipeId(null);
      setImagePreviewUrl(neutralImagePlaceholder);
      setSelectedImageFile(null);
      setPublishMessage(
        getUserFacingErrorMessage(
          error,
          'Your unfinished recipe could not be restored. Please try again.'
        )
      );
      setPublishMessageTone('error');
      setDraftHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

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
      : (() => {
          const avatar = profileAvatar || randomDefaultAvatar();

          return upsertUserProfile(profiles, {
            userId: currentUserId,
            displayName: getDisplayNameFromAuth(currentUser, userAttributes),
            currentUser,
            userAttributes,
            avatar,
            bio: profileBio,
          });
        })();

    const savedProfile = nextProfile[currentUserId];
    setProfileData(savedProfile);
    saveUserProfiles(nextProfile);
    void syncUserProfilesToBackend(nextProfile, client, currentUserId);
    if (savedProfile) {
      setBackendProfilesByUserId((previous) => ({
        ...previous,
        [String(savedProfile.userId)]: savedProfile,
      }));
      setBackendProfilesByUsername((previous) => ({
        ...previous,
        [sanitizeUsername(savedProfile.username)]: savedProfile,
      }));
    }

    // Only prompt for the onboarding modal when the profile explicitly
    // requires username setup. Do not auto-open for missing fields.
    const shouldPromptForSetup = Boolean(
      savedProfile && savedProfile.needsUsernameSetup
    );

    if (shouldPromptForSetup) {
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
        localStorage.setItem(
          PROFILE_CACHE_KEY,
          JSON.stringify({
            ...data,
            nickname: userAttributes.nickname,
            emailPrefix: userAttributes.email?.split('@')[0],
          })
        );
      } catch {
        /* ignore */
      }
    }
  }, [userAttributes]);

  const saveUsernameSetup = async () => {
    if (!currentUserId) return;

    const profiles = loadUserProfiles();
    const existingProfile = profiles[currentUserId];
    const existingUsernames = Object.values(profiles)
      .filter((profile) => profile.userId !== currentUserId)
      .map((profile) => profile.username);
    const suggestedUsername = buildSuggestedUsername(
      existingProfile?.username ||
        getUsernameFromAuth(currentUser, userAttributes) ||
        'cook',
      existingUsernames
    );
    const nextUsername = sanitizeUsername(usernameDraft) || suggestedUsername;

    const errorMessage = validateProfileIdentity({
      profiles,
      userId: currentUserId,
      displayName: existingProfile?.displayName || nextUsername,
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
      // Reject a handle another user already owns on the backend before saving
      // locally, so the public handle stays globally unique.
      if (
        profiles[currentUserId]?.username !== finalUsername &&
        (await isUsernameTakenServerSide(finalUsername, currentUserId, client))
      ) {
        setUsernameError(
          'That username is already taken. Please choose another.'
        );
        return;
      }

      const nextProfiles = upsertUserProfile(profiles, {
        userId: currentUserId,
        displayName: existingProfile?.displayName || finalUsername,
        username: finalUsername,
        currentUser,
        userAttributes,
        needsUsernameSetup: false,
      });

      saveUserProfiles(nextProfiles);
      void syncUserProfilesToBackend(nextProfiles, client, currentUserId);
      void syncProfileToCognito({});
      setProfileData(nextProfiles[currentUserId]);
      setProfileSetupOpen(false);
      setUsernameDraft(finalUsername);
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
    void syncUserProfilesToBackend(
      updated,
      client,
      uid === 'current' ? null : uid
    );
    void syncProfileToCognito({ avatar: file });
    setProfileData(updated[uid]);
    const refreshed = updated[uid];
    if (refreshed) {
      setBackendProfilesByUserId((previous) => ({
        ...previous,
        [String(refreshed.userId)]: refreshed,
      }));
      setBackendProfilesByUsername((previous) => ({
        ...previous,
        [sanitizeUsername(refreshed.username)]: refreshed,
      }));
    }
  };

  const isEditingRecipe = Boolean(editingRecipeId);

  const loadRecipes = useCallback(async () => {
    const requestId = ++feedLoadRequestRef.current;
    setIsLoadingFeed(true);
    setFeedError('');

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
        const errorMessage = errors
          .map((error: any) => error.message)
          .join(', ');
        throw new Error(errorMessage);
      }

      if (!data.length) {
        if (requestId === feedLoadRequestRef.current) setFeedRecipes([]);
        return;
      }

      const profilesByOwnerId = {
        ...loadUserProfiles(),
        ...backendProfilesByUserId,
      };

      const recipes = await Promise.all(
        data
          .filter((recipe: any) => recipe.id && recipe.name && !recipe.isHidden)
          .map(async (recipe: any) => {
            const profileForOwner = profilesByOwnerId[recipe.ownerId || ''];
            const authorHandle = profileForOwner?.username || undefined;
            const authorName = profileForOwner?.username
              ? `@${profileForOwner.username}`
              : recipe.createdBy || 'Arcane cook';

            return {
              id: recipe.id as string,
              ownerId: recipe.ownerId || '',
              name: recipe.name,
              author: authorName,
              authorHandle,
              authorAvatar: profileForOwner?.avatar,
              createdAt: recipe.createdAt
                ? String(recipe.createdAt)
                : undefined,
              description: recipe.description || 'No description yet.',
              notes: recipe.notes || '',
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

      if (requestId === feedLoadRequestRef.current) setFeedRecipes(recipes);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      if (requestId === feedLoadRequestRef.current) {
        setFeedError(
          getUserFacingErrorMessage(
            error,
            'Recipes are temporarily unavailable. Please try again.'
          )
        );
      }
    } finally {
      if (requestId === feedLoadRequestRef.current) {
        feedHasSettledRef.current = true;
        setIsLoadingFeed(false);
      }
    }
  }, [isAuthenticated, backendProfilesByUserId]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const previousAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    if (
      !/^\/saved\/?$/.test(location.pathname) ||
      !isAuthenticated ||
      !activeUsername
    )
      return;
    const params = new URLSearchParams(location.search);
    params.set('collection', 'saved');
    navigate(`${getProfileRoutePath(activeUsername)}?${params.toString()}`, {
      replace: true,
    });
  }, [
    location.pathname,
    location.search,
    isAuthenticated,
    activeUsername,
    navigate,
  ]);

  useEffect(() => {
    if (previousAuthenticatedRef.current && !isAuthenticated) {
      setExpandedRecipeId(null);
      setCurrentView('Discover');
      navigate('/discover');
    }
    previousAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncRecipeRoute = async () => {
      const fullPath = `${location.pathname}${location.search}`;
      const recipeIdFromPath = getRecipeIdFromPath(fullPath);
      const profileUsername = getProfileUsernameFromPath(location.pathname);

      if (recipeIdFromPath) {
        setCurrentView(viewForPath(location.pathname));
        if (location.pathname === '/') {
          navigate(`/discover?recipe=${encodeURIComponent(recipeIdFromPath)}`, {
            replace: true,
          });
          return;
        }

        if (expandedRecipeId === recipeIdFromPath || isLoadingFeed) return;
        if (justClosedRecipeIdRef.current === recipeIdFromPath) {
          return;
        }

        const matchingRecipe = feedRecipes.find(
          (recipe) => recipe.id === recipeIdFromPath
        );

        if (matchingRecipe) {
          setExpandedRecipeId(matchingRecipe.id);
          setExpandedRecipeMessage('');
          void expandRecipe(matchingRecipe);
          return;
        }

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
          const profilesByOwnerId = {
            ...backendProfilesByUserId,
            ...loadUserProfiles(),
          };
          const profileForOwner = profilesByOwnerId[recipe.ownerId || ''];
          const authorHandle = profileForOwner?.username || undefined;
          const authorName = profileForOwner?.username
            ? `@${profileForOwner.username}`
            : recipe.createdBy || 'Arcane cook';

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
            instructions:
              (recipe.instructions?.filter(Boolean) as string[]) ?? [],
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
        return;
      }

      if (profileUsername) {
        setExpandedRecipeId(null);
        setExpandedRecipeMessage('');
        justClosedRecipeIdRef.current = null;
        setCurrentView('Profile');
        return;
      }

      if (location.pathname === '/') {
        navigate('/discover', { replace: true });
        return;
      }

      if (location.pathname === '/discover') {
        if (expandedRecipeId) {
          setExpandedRecipeId(null);
        }
        justClosedRecipeIdRef.current = null;
        setExpandedRecipeMessage('');
        setCurrentView('Discover');
        return;
      }

      if (expandedRecipeId) {
        setExpandedRecipeId(null);
      }
      justClosedRecipeIdRef.current = null;
      setExpandedRecipeMessage('');
      if (location.pathname !== '/discover') {
        const pathView = viewForPath(location.pathname);
        if (pathView !== currentView) {
          setCurrentView(pathView);
        }
      }
    };

    void syncRecipeRoute();
  }, [
    location.pathname,
    location.search,
    feedRecipes,
    isLoadingFeed,
    isAuthenticated,
    expandedRecipeId,
    currentView,
    backendProfilesByUserId,
  ]);

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
        const authModes: Array<'userPool' | 'identityPool'> = isAuthenticated
          ? ['userPool', 'identityPool']
          : ['identityPool'];

        let data: Awaited<
          ReturnType<typeof client.models.Favorite.list>
        >['data'] = [];
        let errors: Awaited<
          ReturnType<typeof client.models.Favorite.list>
        >['errors'] = undefined;

        for (const authMode of authModes) {
          const result = await client.models.Favorite.list({ authMode });
          data = result.data;
          errors = result.errors;

          if (!errors?.length) break;

          const isNotAuthorized = errors.some((error: any) =>
            error.message.toLowerCase().includes('not authorized')
          );

          if (
            !isNotAuthorized ||
            authMode === authModes[authModes.length - 1]
          ) {
            break;
          }
        }

        if (errors?.length) {
          const errorMessage = errors
            .map((error: any) => error.message)
            .join(', ');
          if (errorMessage.toLowerCase().includes('not authorized')) {
            return;
          }

          throw new Error(errorMessage);
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
  }, [isAuthenticated]);

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
    if (!draftHydrated || !isAuthenticated || !currentUserId) {
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
        } else if (draftId) {
          setDraftId(null);
          setDraftImageDataUrl(null);
        }
      })();
    }, 450);

    return () => {
      if (draftAutosaveTimeoutRef.current) {
        clearTimeout(draftAutosaveTimeoutRef.current);
      }
    };
  }, [
    currentUserId,
    draft,
    draftHydrated,
    draftId,
    draftImageDataUrl,
    editingRecipeId,
    isAuthenticated,
  ]);

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
      draft.tags.filter(
        (tag) => tag.toLowerCase() !== tagToRemove.toLowerCase()
      )
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
      name: activeProfile?.displayName || activeUsername || 'Guest cook',
      handle: activeProfile?.username || activeUsername,
      bio: activeProfile?.bio || profileBio || '',
      avatarUrl: avatarUrl || undefined,
      joinDate: activeProfile?.createdAt || undefined,
      kitchenIdentity:
        (currentUserId
          ? backendProfilesByUserId[currentUserId]?.kitchenIdentity
          : undefined) ?? activeProfile?.kitchenIdentity,
      stats: {
        recipes: feedRecipes.filter((r) => r.ownerId === currentUserId).length,
        drafts: 0,
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
    favoriteRecipeIds,
    savedRecipes,
    backendProfilesByUserId,
  ]);

  const publicProfileViewUser = useMemo(() => {
    if (!profileRouteProfile) return null;

    return {
      userId: profileRouteProfile.userId,
      id: profileRouteProfile.userId,
      name: profileRouteProfile.displayName || profileRouteProfile.username,
      handle: profileRouteProfile.username,
      bio: profileRouteProfile.bio || '',
      kitchenIdentity: profileRouteProfile.kitchenIdentity,
      avatarUrl: profileRouteProfile.avatar
        ? avatarEntries.find(
            (entry) => entry.file === profileRouteProfile.avatar
          )?.url
        : undefined,
      joinDate: profileRouteProfile.createdAt || undefined,
      stats: {
        recipes: feedRecipes.filter(
          (recipe) => recipe.ownerId === profileRouteProfile.userId
        ).length,
        drafts: 0,
        likes: 0,
        saved: 0,
      },
    };
  }, [profileRouteProfile, avatarEntries, feedRecipes]);

  const saveKitchenIdentity = async (identity: KitchenIdentity) => {
    if (!isAuthenticated || !currentUserId)
      throw new Error('Sign in to personalize your kitchen.');
    const profile =
      backendProfilesByUserId[currentUserId] ||
      loadUserProfiles()[currentUserId];
    if (!profile)
      throw new Error('Your profile is still loading. Please try again.');
    if (
      identity.signatureRecipeId &&
      !feedRecipes.some(
        (recipe) =>
          recipe.id === identity.signatureRecipeId &&
          recipe.ownerId === currentUserId
      )
    ) {
      throw new Error('Choose one of your published recipes.');
    }
    const savedProfile = await saveKitchenIdentityToBackend(
      profile,
      identity,
      client
    );
    saveUserProfiles({ ...loadUserProfiles(), [currentUserId]: savedProfile });
    setProfileData(savedProfile);
    setBackendProfilesByUserId((previous) => ({
      ...previous,
      [currentUserId]: savedProfile,
    }));
    setBackendProfilesByUsername((previous) => ({
      ...previous,
      [savedProfile.username]: savedProfile,
    }));
  };

  const visibleFeedRecipes = useMemo(() => {
    const query = discoverQuery.trim();

    const matchesTagFilter = (recipe: FeedRecipe) => {
      if (!activeTags.size) return true;

      const recipeTags = new Set(
        recipe.tags.map((tag) => normalizeTag(tag).toLowerCase())
      );
      return Array.from(activeTags.keys()).every((tag) => recipeTags.has(tag));
    };

    const queryWords = query
      .toLowerCase()
      .replace(/(^|\s)@/g, '$1')
      .split(/\s+/)
      .filter(Boolean);

    const filtered = feedRecipes.filter((recipe) => {
      const matchesTag = matchesTagFilter(recipe);
      const matchesAuthor = activeAuthor
        ? sanitizeUsername(recipe.authorHandle || recipe.author) ===
          activeAuthor
        : true;
      if (!query) return matchesTag && matchesAuthor;

      const haystack = [
        recipe.name,
        recipe.author,
        recipe.description,
        recipe.tags.join(' '),
        recipe.authorHandle || '',
      ]
        .join(' ')
        .toLowerCase();

      return (
        matchesTag &&
        matchesAuthor &&
        queryWords.every((word) => haystack.includes(word))
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

    return sorted;
  }, [activeTags, activeAuthor, discoverQuery, feedRecipes, sortOrder]);

  const availableFilterTags = useMemo(() => {
    const tagMap = new Map<string, { label: string; count: number }>();

    for (const recipe of feedRecipes) {
      const seen = new Set<string>();
      for (const tag of recipe.tags) {
        const normalized = normalizeTag(tag);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = tagMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          tagMap.set(key, { label: normalized, count: 1 });
        }
      }
    }

    return Array.from(tagMap.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label)
    );
  }, [feedRecipes]);

  const activeTagLabels = Array.from(
    activeTags.keys(),
    (key) =>
      availableFilterTags.find((tag) => tag.label.toLowerCase() === key)
        ?.label || key
  );

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
    return allExistingTags
      .filter(
        (tag) =>
          tag.toLowerCase().includes(query) &&
          !draft.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
      .slice(0, 8);
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

    navigate('/build', { replace: true });

    if (!draftId && isRecipeDraftEmpty(draft)) {
      setEditingRecipeId(null);
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
    navigate('/build', { replace: true });

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
    if (!draftHydrated) return;
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
        tags:
          (recipeData.tags?.filter(Boolean) as string[])?.map(normalizeTag) ??
          [],
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
      navigate('/build', { replace: true });
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
      setPublishMessage('Sign in to publish recipes.');
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
          nameDuplicateCheck.errors
            .map((error: any) => error.message)
            .join(', ')
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

      if (selectedImageFile && isMockPreview) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(selectedImageFile);
        });
      } else if (selectedImageFile) {
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
            updateResult.errors
              ?.map((error: any) => error.message)
              .join(', ') || 'Recipe could not be updated.'
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
            existingLinksResult.errors
              .map((error: any) => error.message)
              .join(', ')
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
                deleteLinkResult.errors
                  .map((error: any) => error.message)
                  .join(', ')
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
            recipeResult.errors
              ?.map((error: any) => error.message)
              .join(', ') || 'Recipe could not be created.'
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
      setImagePreviewUrl(neutralImagePlaceholder);
      await loadRecipes();
      setActiveTags(new Map());
      setDiscoverQuery('');
      setExpandedRecipeId(null);
      setCurrentView('Discover');
      navigate('/discover');
    } catch (error) {
      console.error('Failed to save recipe:', error);

      let message = getUserFacingErrorMessage(
        error,
        isEditingRecipe
          ? 'Update failed. Check your sandbox deployment and auth.'
          : 'Publish failed. Check your sandbox deployment and auth.'
      );

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

  const expandRecipe = async (recipe: FeedRecipe) => {
    setExpandedRecipeId(recipe.id);
    setExpandedRecipeMessage('');

    const currentUrl = window.location.pathname + window.location.search;
    if (getRecipeIdFromPath(currentUrl) !== recipe.id) {
      const basePath = window.location.pathname.startsWith('/recipe/')
        ? '/discover'
        : window.location.pathname === '/'
          ? '/discover'
          : window.location.pathname || '/discover';
      const params = new URLSearchParams(window.location.search);
      params.set('recipe', recipe.id);
      navigate(`${basePath}?${params.toString()}`);
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
            { authMode: isAuthenticated ? 'userPool' : 'identityPool' }
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
    dismissExpandedRecipe();
    if (typeof window !== 'undefined') {
      const basePath = window.location.pathname.startsWith('/recipe/')
        ? '/discover'
        : window.location.pathname === '/'
          ? '/discover'
          : window.location.pathname || '/discover';
      const params = new URLSearchParams(window.location.search);
      params.delete('recipe');
      navigate(`${basePath}${params.size ? `?${params.toString()}` : ''}`);
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
            .filter((c: any) => c.id && c.userId && c.content && !c.isHidden)
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

  const addComment = async (
    recipeId: string,
    parentId: string | null = null
  ) => {
    if (!isAuthenticated || !client || !commentInput.trim() || !currentUserId)
      return;
    const content = commentInput.trim();
    setCommentInput('');
    setReplyingTo(null);
    setReplyingToAuthor('');
    setShowMentions(false);
    setMentionQuery('');
    setMentionCursor(0);
    try {
      const result = await client.models.Comment.create(
        {
          recipeId,
          userId: currentUserId,
          author: creatorName,
          content,
          ...(parentId ? { parentId } : {}),
        },
        { authMode: 'userPool' }
      );
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

  const editComment = async (
    commentId: string,
    recipeId: string,
    newContent: string
  ) => {
    if (!client || !newContent.trim()) return;
    try {
      const result = await client.models.Comment.update(
        {
          id: commentId,
          content: newContent.trim(),
        },
        { authMode: 'userPool' }
      );
      if (result.data) {
        setComments((prev) => ({
          ...prev,
          [recipeId]: (prev[recipeId] || []).map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  content: newContent.trim(),
                  updatedAt: result.data?.updatedAt || c.updatedAt,
                }
              : c
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
      await client.models.Comment.delete(
        { id: commentId },
        { authMode: 'userPool' }
      );
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
      const username = sanitizeUsername(c.author);
      if (username && !seen.has(username)) {
        seen.add(username);
        authors.push(username);
      }
    }
    const creatorUsername = sanitizeUsername(creatorName);
    if (creatorUsername && !seen.has(creatorUsername)) {
      authors.unshift(creatorUsername);
    }
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
    const username = sanitizeUsername(author);
    if (!username) return;
    const before = commentInput.slice(0, atIdx);
    const after = commentInput.slice(atIdx).replace(/@\w*$/, '');
    setCommentInput(`${before}@${username} ${after}`);
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
        throw new Error(
          result.errors.map((error: any) => error.message).join(', ')
        );
      }

      setFeedRecipes((previous) =>
        previous.filter((recipe) => recipe.id !== recipeId)
      );
      setExpandedRecipeId((previous) =>
        previous === recipeId ? null : previous
      );
      navigate('/discover', { replace: true });
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

  const copyRecipeLink = async (shareUrl: string) => {
    let copied = false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } else if (typeof window !== 'undefined') {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = shareUrl;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.left = '-9999px';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        copied = document.execCommand('copy');
        document.body.removeChild(temporaryInput);
      }
      if (!copied) throw new Error('Clipboard copy failed');
      setRecipeShareCopied(true);
      window.setTimeout(() => setRecipeShareCopied(false), 2000);
    } catch {
      setRecipeShareCopied(false);
    }
  };

  const shareRecipe = async (recipe: FeedRecipe) => {
    if (typeof window === 'undefined') return;

    await copyRecipeLink(getRecipeShareUrl(recipe));
  };

  const expandedRecipeArticle = expandedRecipe ? (
    <article className="ak-panel ak-recipe-detail overflow-hidden">
      <div className="ak-detail-photo relative">
        {isPlaceholder(expandedRecipe.image) ? (
          <div
            className="relative flex h-40 w-full flex-col items-center justify-center text-white sm:h-52"
            style={{ background: sanctuaryBackground }}
          >
            <SanctuaryMotif />
            <svg
              className="relative mb-2 h-12 w-12 text-white/80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            <span className="relative ak-eyebrow text-white/80">
              From the recipe grimoire
            </span>
          </div>
        ) : (
          <>
            <RecipeImage
              src={expandedRecipe.image}
              alt={expandedRecipe.name}
              eager
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowRecipeImageLightbox(true);
              }}
              aria-label="View full-size image"
              title="View full-size image"
              className="ak-button-secondary ak-button-on-dark absolute right-3 top-3 z-20 rounded-full p-2.5"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="ak-detail-body grid gap-6">
        <p className="ak-eyebrow text-[var(--theme-accent)]">
          A page from the community cookbook
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="ak-detail-title break-words">
              {expandedRecipe.name}
            </h3>
            <button
              type="button"
              onClick={() => {
                if (expandedRecipe.authorHandle) {
                  selectAuthorFilter(expandedRecipe.authorHandle);
                }
              }}
              className="ak-author-link mt-4"
            >
              <CookAvatar
                name={expandedRecipe.author}
                avatar={expandedRecipe.authorAvatar}
              />
              by {expandedRecipe.author}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavoriteRecipe(expandedRecipe.id)}
              disabled={pendingFavoriteRecipeIds.has(expandedRecipe.id)}
              aria-pressed={favoriteRecipeIds.has(expandedRecipe.id)}
              aria-label={
                favoriteRecipeIds.has(expandedRecipe.id)
                  ? `Unsave ${expandedRecipe.name}`
                  : `Save ${expandedRecipe.name}`
              }
              className="ak-button-secondary ak-button-save inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm disabled:opacity-60"
            >
              <Heart
                className="h-4 w-4"
                fill={
                  favoriteRecipeIds.has(expandedRecipe.id)
                    ? 'currentColor'
                    : 'none'
                }
                aria-hidden="true"
              />
              {favoriteRecipeIds.has(expandedRecipe.id) ? 'Saved' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => void shareRecipe(expandedRecipe)}
              aria-label="Share"
              title="Copy recipe link"
              className="ak-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              <Share className="h-4 w-4" aria-hidden="true" />
              {recipeShareCopied ? 'Copied!' : 'Share'}
            </button>
            {expandedRecipe.rating !== 'New' && (
              <div className="rounded-md bg-[var(--theme-surface)] px-2.5 py-1 text-sm font-semibold text-[var(--theme-text)] shadow-sm">
                {expandedRecipe.rating}
              </div>
            )}
          </div>
        </div>

        <p className="ak-detail-description">{expandedRecipe.description}</p>

        <div className="ak-detail-facts">
          <span>
            <Clock3 size={17} aria-hidden="true" />{' '}
            {formatRecipeTime(expandedRecipe.time)}
          </span>
          <span>
            <BookOpen size={17} aria-hidden="true" />{' '}
            {expandedRecipe.instructions.length}{' '}
            {expandedRecipe.instructions.length === 1 ? 'step' : 'steps'}
          </span>
          <span>
            <Heart size={17} aria-hidden="true" />
            {recipeSaves[expandedRecipe.id] ?? 0}{' '}
            {(recipeSaves[expandedRecipe.id] ?? 0) === 1 ? 'save' : 'saves'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {expandedRecipe.tags.map((tag) => {
            const category = tagCategoryMap.get(tag.toLowerCase());
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: getTagColor(tag) }}
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

        <RecipeCookingGuide
          key={`${expandedRecipe.id}:${JSON.stringify(expandedRecipeIngredients[expandedRecipe.id] || [])}`}
          recipeId={expandedRecipe.id}
          ingredients={expandedRecipeIngredients[expandedRecipe.id] || []}
          instructions={expandedRecipe.instructions}
          ingredientStatus={
            loadingExpandedRecipeId === expandedRecipe.id
              ? 'Loading ingredients…'
              : expandedRecipeMessage || undefined
          }
        />

        <div className="ak-recipe-sections grid gap-4 lg:grid-cols-2">
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

        <section className="ak-recipe-conversation border-t border-[var(--theme-border)] pt-6">
          <p className="ak-eyebrow mb-2 text-[var(--theme-accent)]">
            Kitchen conversation
          </p>
          <h4 className="text-xl font-semibold text-[var(--theme-text)] mb-4">
            Comments ({(comments[expandedRecipe.id] || []).length})
          </h4>

          {isAuthenticated ? (
            <>
              {loadingComments ? (
                <p className="text-sm text-[var(--theme-text-muted)] mb-4">
                  Loading comments...
                </p>
              ) : (comments[expandedRecipe.id] || []).length === 0 ? (
                <p className="text-sm text-[var(--theme-text-muted)] mb-4">
                  No comments yet. Be the first!
                </p>
              ) : (
                (() => {
                  const allComments = comments[expandedRecipe.id] || [];
                  const rootComments = allComments.filter((c) => !c.parentId);
                  const count =
                    visibleCommentCount[expandedRecipe.id] || COMMENTS_PER_PAGE;
                  const visibleRoots = rootComments.slice(0, count);
                  const hasMore = count < rootComments.length;

                  return (
                    <>
                      <div className="space-y-3 mb-4">
                        {visibleRoots.map((comment) => (
                          <CommentItem
                            key={comment.id}
                            comment={comment}
                            replies={allComments.filter(
                              (r) => r.parentId === comment.id
                            )}
                            isReply={false}
                            currentUserId={currentUserId}
                            onOpenProfile={openProfilePage}
                            onReply={(id, author) => {
                              setReplyingTo(id);
                              setReplyingToAuthor(
                                sanitizeUsername(author) || author
                              );
                              setEditingCommentId(null);
                              setTimeout(
                                () => commentInputRef.current?.focus(),
                                50
                              );
                            }}
                            onEdit={(id, content) =>
                              void editComment(id, expandedRecipe.id, content)
                            }
                            onDelete={(id) =>
                              void deleteComment(id, expandedRecipe.id)
                            }
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
                              [expandedRecipe.id]:
                                (prev[expandedRecipe.id] || COMMENTS_PER_PAGE) +
                                COMMENTS_PER_PAGE,
                            }));
                          }}
                          className="ak-button-secondary mb-4 w-full rounded-xl py-2.5 text-sm"
                        >
                          Show more ({rootComments.length - count} remaining)
                        </button>
                      )}
                    </>
                  );
                })()
              )}

              <div className="relative">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label={
                      replyingTo
                        ? `Reply to ${replyingToAuthor}`
                        : 'Add a comment'
                    }
                    ref={commentInputRef}
                    value={commentInput}
                    onChange={(e) => handleCommentInput(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    placeholder={
                      replyingTo
                        ? `Replying to ${replyingToAuthor}...`
                        : 'Add a comment...'
                    }
                    className="ak-input min-w-0 flex-1 rounded-xl px-4 py-3 text-sm"
                  />
                  <button
                    onClick={() =>
                      void addComment(expandedRecipe.id, replyingTo)
                    }
                    disabled={!commentInput.trim()}
                    className="ak-button-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40"
                  >
                    {replyingTo ? 'Reply' : 'Post'}
                  </button>
                  {replyingTo && (
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyingToAuthor('');
                        setCommentInput('');
                      }}
                      className="ak-button-secondary rounded-xl px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {showMentions &&
                  (() => {
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
                                ? 'bg-[#0891b2]/10 text-[#0e7490]'
                                : 'text-[var(--theme-text)] hover:bg-[var(--theme-surface-alt)]'
                            }`}
                          >
                            <span className="font-medium text-[#0891b2]">
                              @{author}
                            </span>
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
                className="ak-button-secondary rounded-lg px-3 py-1.5 text-sm"
              >
                Sign in
              </button>{' '}
              to join the conversation.
            </p>
          )}
        </section>

        {isAuthenticated && expandedRecipe.ownerId === currentUserId && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-3">
            <button
              type="button"
              onClick={() =>
                void startEditRecipe(expandedRecipe.id, expandedRecipe.ownerId)
              }
              disabled={loadingEditRecipeId === expandedRecipe.id}
              className="ak-button-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-60"
            >
              {loadingEditRecipeId === expandedRecipe.id
                ? 'Opening...'
                : 'Edit'}
            </button>
            <button
              type="button"
              onClick={() =>
                deleteRecipe(expandedRecipe.id, expandedRecipe.ownerId)
              }
              disabled={deletingRecipeIds.has(expandedRecipe.id)}
              className={`rounded-xl px-4 py-2 text-sm disabled:opacity-60 ${armedDeleteRecipeIds.has(expandedRecipe.id) ? 'ak-button-danger' : 'ak-button-danger-soft'}`}
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

  const discoverCalling = kitchenCalling(
    normalizeKitchenIdentity(
      isAuthenticated ? profileViewUser.kitchenIdentity : undefined
    ).calling
  );

  const hearthCooks = useMemo(() => {
    const cooks = new Map<
      string,
      { userId: string; username: string; avatar?: string; recipes: number }
    >();
    feedRecipes.forEach((recipe) => {
      if (!recipe.authorHandle || !recipe.ownerId) return;
      const existing = cooks.get(recipe.ownerId);
      if (existing) existing.recipes += 1;
      else
        cooks.set(recipe.ownerId, {
          userId: recipe.ownerId,
          username: recipe.authorHandle,
          avatar: recipe.authorAvatar,
          recipes: 1,
        });
    });
    return [...cooks.values()]
      .sort(
        (a, b) => b.recipes - a.recipes || a.username.localeCompare(b.username)
      )
      .slice(0, 4);
  }, [feedRecipes]);

  const featuredAuthor = featuredRecipe
    ? backendProfilesByUserId[featuredRecipe.ownerId] ||
      localProfiles[featuredRecipe.ownerId]
    : undefined;

  return (
    <main
      style={sanctuaryThemeStyle(
        isAuthenticated ? profileViewUser.kitchenIdentity?.theme : undefined
      )}
      className="ak-app-shell ak-page-glow flex h-screen h-dvh flex-col overflow-x-hidden overflow-y-hidden"
    >
      {profileSetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-cozy-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
              Welcome aboard
            </p>
            <h3 className="mt-2 font-heading text-xl font-semibold text-[var(--theme-text)]">
              Pick your public identity
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
              Choose a username so other cooks can find your recipes and
              profile.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--theme-text)]">
                  Username
                </span>
                <input
                  value={usernameDraft}
                  onChange={(event) => setUsernameDraft(event.target.value)}
                  placeholder="your-handle"
                  className="ak-input rounded px-3 py-2 text-sm outline-none transition"
                />
                {usernameError && (
                  <p className="text-xs text-red-600">{usernameError}</p>
                )}
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileSetupOpen(false)}
                className="ak-button-secondary rounded-xl px-4 py-2.5 text-sm"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => void saveUsernameSetup()}
                disabled={usernameSavePending}
                className="ak-button-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
              >
                {usernameSavePending ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[var(--theme-accent)]/[0.02] to-transparent" />
      <a
        className="ak-skip-link"
        href={`#${currentView === 'Build' ? 'build' : currentView === 'Profile' ? 'profile' : currentView === 'SavedRecipes' ? 'saved-recipes' : 'discover'}`}
      >
        Skip to content
      </a>
      <WorkspaceHeader
        onHome={() => {
          setExpandedRecipeId(null);
          setCurrentView('Discover');
          navigate('/discover');
        }}
        profilePath={getProfileRoutePath(activeUsername)}
        profileLabel={activeUsername || 'Guest cook'}
        profileAvatar={effectiveAvatar}
        isAuthenticated={isAuthenticated}
        onRequestAuth={onRequestAuth}
      />

      <div
        className={`ak-page-rail ak-workspace relative flex-1 min-h-0 gap-6 ${
          currentView === 'Build'
            ? 'ak-workspace-build block lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] lg:grid-rows-[auto_minmax(0,1fr)]'
            : 'grid'
        }`}
      >
        <section
          id="discover"
          tabIndex={-1}
          className={`ak-discover-scroll mx-auto min-h-0 w-full overflow-y-auto ${
            currentView === 'Discover' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div className="ak-discover-content">
            <PageBanner
              className="ak-discover-intro"
              callingId={discoverCalling.id}
            >
              <div className="ak-emporium-heading relative">
                <div>
                  <h1 className="ak-banner-title text-white">Emporium</h1>
                  <p>Good food is better shared.</p>
                </div>
                <Button
                  variant="banner"
                  onClick={startCreateRecipe}
                  aria-label="Create a recipe"
                  title="Create a recipe"
                  className="shrink-0"
                >
                  <Plus size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Create recipe</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </div>
              <div className="ak-search-row relative flex items-stretch gap-3">
                <div
                  role="search"
                  aria-label="Search and sort recipes"
                  className="ak-discover-search group flex min-w-0 flex-1 items-center rounded-2xl border transition focus-within:border-[var(--theme-accent)] focus-within:shadow-md focus-within:ring-4 focus-within:ring-[var(--theme-focus)]"
                >
                  <Search
                    className="ml-4 h-5 w-5 shrink-0 text-[var(--theme-text-muted)] transition group-focus-within:text-[var(--theme-accent)]"
                    aria-hidden="true"
                  />
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={discoverQuery}
                      onChange={(event) => setDiscoverQuery(event.target.value)}
                      aria-label="Search recipes"
                      placeholder="Search recipes…"
                      className="h-12 w-full bg-transparent px-3 pr-10 text-sm text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-muted)]"
                    />
                    {discoverQuery && (
                      <button
                        type="button"
                        onClick={() => setDiscoverQuery('')}
                        aria-label="Clear search"
                        title="Clear search"
                        className="ak-button-ghost absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="h-7 w-px shrink-0 bg-[var(--theme-border)]" />
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((current) =>
                        current === 'desc' ? 'asc' : 'desc'
                      )
                    }
                    aria-label={`Sort recipes: ${sortOrder === 'desc' ? 'newest first' : 'oldest first'}. Activate to reverse.`}
                    title={
                      sortOrder === 'desc' ? 'Newest first' : 'Oldest first'
                    }
                    className="ak-button-ghost inline-flex w-12 shrink-0 items-center justify-center gap-2 self-stretch rounded-r-2xl sm:w-28"
                  >
                    <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden text-xs font-semibold sm:inline">
                      {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </span>
                  </button>
                </div>
              </div>
            </PageBanner>

            {(activeAuthor || availableFilterTags.length > 0) && (
              <div className="ak-discover-filters relative space-y-4">
                {activeAuthor && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-border)] bg-gradient-to-r from-[var(--theme-surface)] to-[var(--theme-surface-alt)] px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">
                        Author collection
                      </p>
                      <p className="mt-0.5 font-heading text-base font-semibold text-[var(--theme-text)]">
                        Recipes by @{activeAuthor}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={getProfileRoutePath(activeAuthor)}
                        onClick={() => setActiveAuthor(null)}
                        className="ak-button-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm sm:flex-none"
                      >
                        View author profile
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M7 17 17 7M7 7h10v10" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveAuthor(null)}
                        aria-label={`Clear author collection @${activeAuthor}`}
                        title="Clear author collection"
                        className="ak-button-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                <RecipeTagFilters
                  tags={availableFilterTags}
                  selected={activeTags}
                  onSelect={handleFilterClick}
                  onClear={() => setActiveTags(new Map())}
                />
              </div>
            )}

            <div className="ak-discover-layout">
              <div className="min-w-0">
                {isLoadingFeed && (
                  <p role="status" className="sr-only">
                    Loading shared recipes...
                  </p>
                )}

                {/* Recipe grid */}
                <section
                  className="ak-recipe-results"
                  aria-label="Recipe results"
                  aria-busy={isLoadingFeed}
                >
                  {feedError && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center"
                    >
                      <h2 className="text-xl">
                        The kitchen is taking a moment
                      </h2>
                      <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
                        {feedError}
                      </p>
                      <Button
                        type="button"
                        onClick={() => void loadRecipes()}
                        className="mt-5"
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                  {expandedRecipeMessage && !expandedRecipe ? (
                    <div className="ak-panel mt-6 p-8 text-center">
                      <ErrorArtwork />
                      <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                        {expandedRecipeMessage}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                        The shared recipe may have been removed or the link may
                        be invalid.
                      </p>
                      <Link
                        to="/discover"
                        className="ak-button-primary mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
                      >
                        Browse recipes
                      </Link>
                    </div>
                  ) : visibleFeedRecipes.length ? (
                    <>
                      <div className="ak-collection-heading">
                        <div>
                          <p className="ak-eyebrow">
                            From our kitchens to yours
                          </p>
                          <h2>
                            {activeAuthor
                              ? 'An author’s collection'
                              : activeTags.size > 1
                                ? 'Recipes matching your tags'
                                : activeTags.size === 1
                                  ? `${activeTagLabels[0]} recipes`
                                  : discoverQuery
                                    ? 'Your discoveries'
                                    : 'Fresh from the community'}
                          </h2>
                        </div>
                        <span className="ak-result-count">
                          {visibleFeedRecipes.length}{' '}
                          {visibleFeedRecipes.length === 1
                            ? 'recipe'
                            : 'recipes'}
                        </span>
                      </div>
                      {(discoverQuery.trim() || activeTags.size > 0) && (
                        <div
                          role="status"
                          className="mb-4 text-sm text-[var(--theme-text-muted)]"
                        >
                          {visibleFeedRecipes.length}{' '}
                          {visibleFeedRecipes.length === 1
                            ? 'recipe'
                            : 'recipes'}{' '}
                          found
                          {discoverQuery.trim() &&
                            ` for “${discoverQuery.trim()}”`}
                          {activeTags.size > 0 &&
                            ` matching ${activeTags.size === 1 ? activeTagLabels[0] : `all ${activeTags.size} selected tags`}`}
                        </div>
                      )}
                      <div className="ak-feed-grid grid gap-5 sm:grid-cols-2">
                        {visibleFeedRecipes.map((recipe) => (
                          <FeedRecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            isFavorited={favoriteRecipeIds.has(recipe.id)}
                            isPendingFavorite={pendingFavoriteRecipeIds.has(
                              recipe.id
                            )}
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
                            onOpenProfile={selectAuthorFilter}
                          />
                        ))}
                      </div>
                    </>
                  ) : isLoadingFeed || feedError ? null : (
                    <div className="ak-empty-state">
                      <p className="font-heading text-xl font-semibold text-[var(--theme-text)]">
                        {discoverQuery || activeTags.size > 0 || activeAuthor
                          ? 'No recipes match these filters'
                          : 'No recipes have been shared yet'}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                        {discoverQuery || activeTags.size > 0 || activeAuthor
                          ? 'Try a different search or clear the filters.'
                          : 'Create a recipe to add it to the Emporium.'}
                      </p>
                      {discoverQuery || activeTags.size > 0 || activeAuthor ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDiscoverQuery('');
                            setActiveTags(new Map());
                            setActiveAuthor(null);
                          }}
                          className="ak-button-secondary mt-5 rounded-xl px-5 py-3 text-sm font-semibold"
                        >
                          Clear all filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startCreateRecipe}
                          className="ak-button-primary mt-5 rounded-xl px-5 py-3 text-sm font-semibold"
                        >
                          Create recipe
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </div>
              <CommunityHearth
                cooks={hearthCooks}
                featuredRecipe={
                  featuredRecipe
                    ? {
                        ...featuredRecipe,
                        author: featuredAuthor?.username
                          ? `@${featuredAuthor.username}`
                          : featuredRecipe.author,
                        authorHandle: featuredAuthor?.username,
                        authorAvatar: featuredAuthor?.avatar || undefined,
                      }
                    : null
                }
                onOpenFeatured={(recipeId) => {
                  const params = new URLSearchParams(location.search);
                  params.set('recipe', recipeId);
                  navigate({
                    pathname: location.pathname,
                    search: params.toString(),
                  });
                }}
                onSelectAuthor={selectAuthorFilter}
                canManageFeature={isAdmin}
                manageFeaturePath={`${getProfileRoutePath(activeUsername)}?workspace=backrooms`}
                collectionPath={
                  isAuthenticated
                    ? `${getProfileRoutePath(activeUsername)}?collection=saved`
                    : undefined
                }
                onRequestAuth={onRequestAuth}
              />
            </div>
            <div className="ak-feed-endnote">
              <span /> <Sparkles size={16} aria-hidden="true" />{' '}
              <p>Every recipe has a story. What’s yours?</p> <span />
            </div>
          </div>
        </section>

        {currentView === 'Build' && (
          <div className="ak-build-banner shrink-0 lg:col-span-2">
            <SanctuaryHeading
              title={isEditingRecipe ? 'Edit recipe' : 'New recipe'}
              callingId={discoverCalling.id}
              description={
                !isAuthenticated ? 'Sign in to publish recipes.' : undefined
              }
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('Discover');
                    navigate('/discover');
                  }}
                  aria-label="Back to recipes"
                  className="ak-banner-action"
                >
                  ← Recipes
                </button>
              }
            />
          </div>
        )}

        <section
          id="build"
          tabIndex={-1}
          className={`ak-panel relative min-h-0 overflow-hidden ${
            currentView === 'Build'
              ? 'flex flex-col lg:col-start-1 lg:row-start-2'
              : 'hidden'
          }`}
        >
          <div className="shrink-0">
            {!isEditingRecipe && (
              <div className="border-b border-[var(--theme-border)] px-5 py-3">
                <button
                  type="button"
                  onClick={loadExampleRecipe}
                  disabled={!draftHydrated}
                  className="text-xs font-semibold text-[var(--theme-accent)] underline decoration-dotted underline-offset-4"
                >
                  Need inspiration? Load an example
                </button>
              </div>
            )}
            {isAuthenticated && (
              <RecipeReadiness
                draft={draft}
                hasPhoto={!isPlaceholder(imagePreviewUrl)}
              />
            )}
          </div>

          <fieldset
            disabled={!isAuthenticated || !draftHydrated}
            className={`ak-editor-fields min-h-0 min-w-0 flex-1 content-start gap-7 overflow-x-hidden overflow-y-auto bg-[var(--theme-bg)]/50 p-4 sm:p-6 ${!isAuthenticated ? 'hidden' : 'grid'}`}
          >
            {publishMessage && (
              <div
                role="status"
                className={`rounded-lg border px-3 py-2 text-sm ${
                  publishMessageTone === 'error'
                    ? 'border-[#e5b3b3] bg-[#fff1f1] text-[#8f1d1d]'
                    : 'border-[#b7d9c8] bg-[#edf9f2] text-[#1f6b42]'
                }`}
              >
                {publishMessage}
              </div>
            )}

            <section
              className="ak-editor-section"
              aria-labelledby="recipe-essentials-heading"
            >
              <div className="ak-editor-section-heading">
                <h3 id="recipe-essentials-heading">
                  <span className="ak-editor-chapter">01</span> The essentials
                </h3>
                <p>
                  A name, a few words, and a photograph of the finished dish.
                </p>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Recipe name</span>
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  placeholder="e.g., Black garlic & wild mushroom broth"
                  className="ak-input rounded-xl px-4 py-3 font-heading text-xl outline-none transition"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    updateDraft('description', event.target.value)
                  }
                  placeholder="Its origins, its flavor, and what makes it worth keeping."
                  rows={3}
                  className="ak-input resize-y rounded-xl px-4 py-3 outline-none transition"
                />
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-end">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">
                    Prep time (minutes)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="5999"
                    step="1"
                    inputMode="numeric"
                    placeholder="e.g., 30"
                    value={
                      draft.prepTime
                        ? Number(draft.prepTime.split(':')[0]) * 60 +
                          Number(draft.prepTime.split(':')[1] || 0)
                        : ''
                    }
                    onChange={(event) => {
                      const minutes = Math.min(
                        5999,
                        Math.max(0, Math.trunc(Number(event.target.value)))
                      );
                      updateDraft(
                        'prepTime',
                        event.target.value === ''
                          ? ''
                          : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
                      );
                    }}
                    className="ak-input min-w-0 rounded-xl px-4 py-3"
                  />
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-semibold">
                  Recipe photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      updateImageFile(event.target.files?.[0])
                    }
                    className="ak-input w-full min-w-0 rounded-xl p-2 text-xs file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--theme-surface-alt)] file:px-3 file:py-2 file:font-semibold file:text-[var(--theme-text)]"
                  />
                </label>
              </div>
            </section>
            <details className="ak-editor-section">
              <summary className="cursor-pointer text-sm font-semibold">
                Tags{' '}
                <span className="font-normal text-[var(--theme-text-muted)]">
                  · Optional
                  {draft.tags.length ? ` · ${draft.tags.length} added` : ''}
                </span>
              </summary>
              <div className="grid gap-2">
                <div className="relative grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative">
                    <input
                      aria-label="Tags"
                      value={newTagValue}
                      onChange={(event) => setNewTagValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        addTag();
                      }}
                      placeholder="e.g., Soup — press Enter to add"
                      className="ak-input rounded px-3 py-2 text-sm outline-none w-full"
                      disabled={draft.tags.length >= 10}
                    />
                    {tagSuggestions.length > 0 && (
                      <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-cozy-lg">
                        {tagSuggestions.map((tag) => {
                          const category = tagCategoryMap.get(
                            tag.toLowerCase()
                          );
                          return (
                            <button
                              key={tag}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                updateDraft('tags', [...draft.tags, tag]);
                                setNewTagValue('');
                              }}
                              className="ak-menu-item justify-between text-left"
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
                  <p className="text-xs text-[var(--theme-text-muted)]">
                    Maximum of 10 tags allowed
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {draft.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ak-button-primary inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                      style={{ backgroundColor: getTagColor(tag) }}
                      aria-label={`Remove tag ${tag}`}
                      title={`Remove ${tag}`}
                    >
                      {tag}
                      <span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
              </div>
            </details>

            <section
              className="ak-editor-section"
              aria-labelledby="recipe-ingredients-heading"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3
                  id="recipe-ingredients-heading"
                  className="font-heading text-xl"
                >
                  <span className="ak-editor-chapter">02</span> Ingredients
                </h3>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="ak-button-secondary rounded-md px-3 py-1.5 text-sm font-semibold"
                >
                  + Add ingredient
                </button>
              </div>
              <div className="grid gap-2">
                {draft.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="grid min-w-0 gap-2 rounded-xl border border-[var(--theme-border)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] sm:items-start"
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
                        placeholder="Ingredient name"
                        className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredient(ingredient.id)}
                        className="ak-button-danger-soft h-10 w-10 rounded-lg text-sm"
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
                        placeholder="Unit (e.g., g)"
                        className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="ak-editor-section"
              aria-labelledby="recipe-method-heading"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 id="recipe-method-heading" className="font-heading text-xl">
                  <span className="ak-editor-chapter">03</span> Method
                </h3>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="ak-button-secondary rounded-md px-3 py-1.5 text-sm font-semibold"
                >
                  Add step
                </button>
              </div>
              <div className="grid gap-2">
                {draft.instructions.map((instruction, index) => (
                  <div
                    key={`instruction-${index}`}
                    className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--theme-surface)] text-sm font-semibold text-[var(--theme-accent-strong)] ring-1 ring-[var(--theme-border)]">
                      {index + 1}
                    </span>
                    <textarea
                      aria-label={`Step ${index + 1}`}
                      value={instruction}
                      onChange={(event) =>
                        updateInstruction(index, event.target.value)
                      }
                      placeholder={
                        index === 0
                          ? 'Start with the preparation. Include temperatures and timings.'
                          : 'What happens next? Describe one clear step.'
                      }
                      rows={3}
                      className="ak-input min-w-0 resize-y rounded-xl px-3 py-3 text-sm leading-6 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="ak-button-danger-soft h-9 w-9 rounded-lg text-sm"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <details className="ak-editor-section">
              <summary className="cursor-pointer font-semibold">
                Notes & equipment{' '}
                <span className="text-sm font-normal text-[var(--theme-text-muted)]">
                  · Optional
                </span>
              </summary>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Notes</span>
                <textarea
                  value={draft.notes || ''}
                  onChange={(event) => updateDraft('notes', event.target.value)}
                  placeholder="Substitutions, storage, or observations for the next cook."
                  rows={3}
                  className="ak-input resize-y rounded-xl px-4 py-3 text-sm"
                />
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Equipment</h3>
                  <button
                    type="button"
                    onClick={addUtensil}
                    className="ak-button-secondary rounded-md px-3 py-1.5 text-sm font-semibold"
                  >
                    + Add utensil
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
                        placeholder="e.g., Cast-iron pot"
                        className="ak-input min-w-0 rounded px-3 py-2 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeUtensil(index)}
                        className="ak-button-danger-soft h-10 w-10 rounded-lg text-sm"
                        aria-label="Remove utensil"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </fieldset>

          {!isAuthenticated && (
            <div className="m-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center">
              <p className="text-[var(--theme-accent)] text-xs font-semibold uppercase">
                Account Required
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-normal">
                Start publishing your own recipes
              </h3>
              <p className="text-[var(--theme-text-muted)] mx-auto mt-2 max-w-sm text-sm leading-6">
                Sign in to add ingredients, write steps, and post recipes to the
                shared feed.
              </p>
              <button
                onClick={onRequestAuth}
                className="ak-button-primary mt-5 rounded-xl px-5 py-3 text-sm font-semibold"
              >
                Sign in to create
              </button>
            </div>
          )}
        </section>

        <section
          id="saved-recipes"
          tabIndex={-1}
          key={
            currentView === 'SavedRecipes'
              ? 'saved-recipes-visible'
              : 'saved-recipes-hidden'
          }
          className={`min-h-0 overflow-y-auto ${
            currentView === 'SavedRecipes' ? 'flex flex-col' : 'hidden'
          }`}
        >
          <div className="w-full">
            {!isAuthenticated ? (
              <div className="ak-empty-state">
                <h2 className="text-2xl">Keep your next favorite close</h2>
                <p className="mt-3 text-sm text-[var(--theme-text-muted)]">
                  Sign in to save recipes and build your personal collection.
                </p>
                <button
                  type="button"
                  onClick={onRequestAuth}
                  className="ak-button-primary mt-5 rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Sign in to save recipes
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section
          id="profile"
          tabIndex={-1}
          key={currentView === 'Profile' ? 'profile-visible' : 'profile-hidden'}
          className={`min-h-0 overflow-y-auto ${
            currentView === 'Profile' ? 'flex flex-col' : 'hidden'
          }`}
        >
          {Boolean(requestedProfileKey) &&
          !isViewingOwnProfile &&
          !isViewingExternalProfile &&
          (isProfileRouteLoading ||
            profileRouteUsername !== requestedProfileKey) ? (
            <ProfileSkeleton />
          ) : isViewingExternalProfile && publicProfileViewUser ? (
            <UserProfileView
              user={publicProfileViewUser}
              isLoadingRecipes={isLoadingFeed && !feedHasSettledRef.current}
              publishedRecipes={feedRecipes
                .filter(
                  (recipe) => recipe.ownerId === publicProfileViewUser.userId
                )
                .map((recipe) => ({
                  id: recipe.id,
                  title: recipe.name,
                  time: recipe.time,
                  image: recipe.image,
                  likes: 0,
                  saves: recipeSaves[recipe.id] ?? 0,
                }))}
              favoriteRecipeIds={favoriteRecipeIds}
              pendingFavoriteRecipeIds={pendingFavoriteRecipeIds}
              onToggleFavorite={toggleFavoriteRecipe}
              onOpenRecipe={(recipeId: string | number) => {
                const recipe = feedRecipes.find(
                  (entry) => entry.id === String(recipeId)
                );
                if (recipe) void expandRecipe(recipe);
              }}
              isOwnProfile={false}
            />
          ) : !isViewingOwnProfile &&
            (requestedProfileUsername !== null || currentView === 'Profile') ? (
            <div className="w-full p-8 text-center">
              <ErrorArtwork />
              <h1 className="font-heading text-2xl font-semibold text-[var(--theme-text)]">
                Profile not found
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">
                We couldn’t locate that creator profile. Try checking a
                different profile link.
              </p>
              <Link
                to="/discover"
                className="ak-button-primary mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
              >
                Browse the Emporium
              </Link>
            </div>
          ) : (
            <UserProfileView
              user={profileViewUser}
              isAdmin={isAdmin && isViewingOwnProfile}
              onSignOut={isViewingOwnProfile ? onSignOut : undefined}
              onAdminContentChanged={() => {
                setExpandedRecipeIngredients({});
                setComments({});
                setAdminRevision((value) => value + 1);
              }}
              isLoadingRecipes={isLoadingFeed && !feedHasSettledRef.current}
              onSaveKitchenIdentity={saveKitchenIdentity}
              publishedRecipes={feedRecipes
                .filter((r) => r.ownerId === currentUserId)
                .map((r) => ({
                  id: r.id,
                  title: r.name,
                  time: r.time,
                  image: r.image,
                  likes: 0,
                  saves: recipeSaves[r.id] ?? 0,
                }))}
              savedRecipes={savedRecipes.map((r) => ({
                id: r.id,
                title: r.name,
                time: r.time,
                image: r.image,
                likes: 0,
                saves: recipeSaves[r.id] ?? 0,
              }))}
              favoriteRecipeIds={favoriteRecipeIds}
              pendingFavoriteRecipeIds={pendingFavoriteRecipeIds}
              onToggleFavorite={toggleFavoriteRecipe}
              onSelectPreset={handleSelectAvatarPreset}
              onNewRecipe={startCreateRecipe}
              onOpenRecipe={(recipeId: string | number) => {
                const recipe = feedRecipes.find(
                  (r) => r.id === String(recipeId)
                );
                if (recipe) void expandRecipe(recipe);
              }}
              onRecipeOptions={(recipeId: string | number) => {
                void startEditRecipe(String(recipeId), currentUserId || '');
              }}
              onProfileUpdated={({ handle, bio }) => {
                // optimistic update of profile in-memory and persist
                const uid = currentUserId || 'current';
                const profiles = loadUserProfiles();
                const existingProfile = profiles[uid];
                const updated = upsertUserProfile(profiles, {
                  userId: uid,
                  displayName: existingProfile?.displayName || handle || uid,
                  username: handle,
                  bio,
                });
                saveUserProfiles(updated);
                void syncUserProfilesToBackend(
                  updated,
                  client,
                  uid === 'current' ? null : uid
                );
                void syncProfileToCognito({ bio });
                // refresh the backend-derived profile map so author attribution
                // and public routing reflect the change immediately
                const refreshed = updated[uid];
                if (refreshed) {
                  setBackendProfilesByUserId((previous) => ({
                    ...previous,
                    [String(refreshed.userId)]: refreshed,
                  }));
                  setBackendProfilesByUsername((previous) => ({
                    ...previous,
                    [sanitizeUsername(refreshed.username)]: refreshed,
                  }));
                }

                // update local UI pieces
                setProfileData(updated[uid]);
                if (handle && handle !== activeUsername) {
                  navigate(getProfileRoutePath(handle), { replace: true });
                }
                // update profileViewUser via state dependencies by touching profileData
                onProfileSaved?.();
              }}
            />
          )}
        </section>

        <aside
          className={`min-h-0 gap-4 ${
            currentView === 'Build'
              ? 'grid lg:col-start-2 lg:row-start-2 lg:grid-rows-[minmax(0,1fr)]'
              : 'hidden'
          }`}
        >
          <section
            className={`ak-panel relative min-h-0 overflow-hidden ${
              currentView === 'Build' ? 'flex flex-col' : 'hidden'
            }`}
          >
            <div className="border-b border-[var(--theme-border)] px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="ak-eyebrow mb-2 text-[var(--theme-text-muted)]">
                    Before you share
                  </p>
                  <h2 className="font-heading text-lg font-semibold text-[var(--theme-text)]">
                    Preview
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">
                    {isEditingRecipe
                      ? 'Review your updates'
                      : 'Updates as you write'}
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
                        navigate('/discover');
                      }}
                      className="ak-button-secondary rounded-xl px-4 py-2.5 text-sm"
                    >
                      Cancel
                    </button>
                    <Button
                      onClick={publishRecipe}
                      isLoading={isPublishing}
                      disabled={isPublishing || !draftHydrated}
                    >
                      {isPublishing
                        ? isEditingRecipe
                          ? 'Saving...'
                          : 'Publishing...'
                        : isEditingRecipe
                          ? 'Save changes'
                          : 'Publish'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <article className="ak-recipe-card overflow-hidden">
                {isPlaceholder(imagePreviewUrl) ? (
                  <div
                    className="ak-recipe-media group flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-alt)] transition-all hover:border-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
                    role="button"
                    tabIndex={0}
                    aria-label="Add Photo"
                    onClick={() => {
                      if (!isAuthenticated) {
                        onRequestAuth?.();
                        return;
                      }
                      const input = document.querySelector<HTMLInputElement>(
                        '#recipe-photo-input-sidebar'
                      );
                      input?.click();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isAuthenticated) {
                          onRequestAuth?.();
                          return;
                        }
                        const input = document.querySelector<HTMLInputElement>(
                          '#recipe-photo-input-sidebar'
                        );
                        input?.click();
                      }
                    }}
                  >
                    <svg
                      className="mb-2 h-10 w-10 text-[var(--theme-text-muted)] transition-all group-hover:scale-110 group-hover:text-[var(--theme-accent)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-[var(--theme-text-muted)] transition-all group-hover:text-[var(--theme-accent)]">
                      Add Photo
                    </span>
                    <input
                      id="recipe-photo-input-sidebar"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        updateImageFile(event.target.files?.[0])
                      }
                      className="sr-only"
                    />
                  </div>
                ) : (
                  <img
                    src={imagePreviewUrl}
                    alt={draft.name || 'Recipe preview'}
                    className="ak-recipe-media w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-semibold leading-snug text-[var(--theme-text)]">
                        {draft.name || 'Untitled recipe'}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                        by {activeUsername || 'Guest cook'}
                      </p>
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
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: getTagColor(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {draft.ingredients.some((ing) => ing.name) && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">
                        Ingredients
                      </h4>
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
                  {draft.instructions.some((inst) => inst.trim()) && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">
                        Instructions
                      </h4>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--theme-text)]">
                        {draft.instructions
                          .map((instruction) => instruction.trim())
                          .filter(Boolean)
                          .map((instruction, index) => (
                            <li key={`preview-step-${index}`}>{instruction}</li>
                          ))}
                      </ol>
                    </div>
                  )}
                  {draft.notes?.trim() && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">
                        Notes
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--theme-text)]">
                        {draft.notes}
                      </p>
                    </div>
                  )}
                  {draft.utensils.some((ut) => ut.trim()) && (
                    <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
                      <h4 className="text-sm font-semibold text-[var(--theme-text)]">
                        Utensils
                      </h4>
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
      <WorkspaceFooter />

      {!expandedRecipe &&
        expandedRecipeMessage &&
        currentView !== 'Discover' &&
        getRecipeIdFromPath(location.pathname + location.search) && (
          <AccessibleDialog
            label="Recipe unavailable"
            onClose={collapseExpandedRecipe}
          >
            <section className="ak-card mx-auto my-8 w-full max-w-lg rounded-3xl p-6 text-center">
              <ErrorArtwork />
              <h1 className="text-2xl">{expandedRecipeMessage}</h1>
              <p className="mt-3 text-sm text-[var(--theme-text-muted)]">
                The recipe may have been removed, or the kitchen is temporarily
                unavailable.
              </p>
              <button
                type="button"
                onClick={collapseExpandedRecipe}
                className="ak-button-primary mt-5 rounded-xl px-5 py-3 font-semibold"
              >
                Back to collection
              </button>
            </section>
          </AccessibleDialog>
        )}
      {expandedRecipe &&
        getRecipeIdFromPath(location.pathname + location.search) ===
          expandedRecipe.id && (
          <AccessibleDialog
            label={expandedRecipe.name}
            onClose={() => {
              if (showRecipeImageLightbox) setShowRecipeImageLightbox(false);
              else collapseExpandedRecipe();
            }}
            dismissOnBackdrop
            className="ak-recipe-dialog fixed inset-0 z-50 overflow-y-auto bg-[var(--theme-overlay)] backdrop-blur-sm"
          >
            <div
              className="ak-recipe-dialog-frame mx-auto w-full"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ak-recipe-dialog-toolbar">
                <span>
                  <BookOpen size={17} aria-hidden="true" /> The recipe grimoire
                </span>
                <button
                  type="button"
                  onClick={collapseExpandedRecipe}
                  aria-label="Close recipe"
                  className="ak-button-ghost inline-flex items-center gap-2 rounded-full p-2"
                >
                  <span className="text-xs">Close</span>
                  <X size={19} aria-hidden="true" />
                </button>
              </div>
              {expandedRecipeArticle}
            </div>
          </AccessibleDialog>
        )}
      {showRecipeImageLightbox &&
        expandedRecipe &&
        !isPlaceholder(expandedRecipe.image) && (
          <AccessibleDialog
            label={`Full-size image of ${expandedRecipe.name}`}
            onClose={() => setShowRecipeImageLightbox(false)}
            dismissOnBackdrop
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setShowRecipeImageLightbox(false)}
              aria-label="Close full-size image"
              className="ak-button-secondary ak-button-on-dark absolute right-4 top-4 rounded-full p-2.5"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <img
              src={expandedRecipe.image}
              alt={expandedRecipe.name}
              className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </AccessibleDialog>
        )}
    </main>
  );
};

export default RecipeBuilder;
