import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Search,
  X,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  ArrowUpRight,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import { Link, useLocation } from 'react-router-dom';
import {
  matchesAdminSearch,
  readAllAdminPages,
  requireAdminResult,
  userModerationStatus,
} from '../utils/adminConsole';
import { client } from '../dataClient';
import { randomMerlinColor } from '../theme/merlinPalette';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceFooter from './WorkspaceFooter';
import CookAvatar from './ui/CookAvatar';
import RecipePhoto from './ui/RecipePhoto';
import SanctuaryHeading from './ui/SanctuaryHeading';
import { sanctuaryThemeStyle } from '../theme/sanctuaryTheme';
import { kitchenCalling } from '../utils/kitchenIdentity';
import { getUserFacingErrorMessage } from '../utils/userFacingErrors';
import {
  readFeaturedSelection,
  saveFeaturedRecipe,
} from '../utils/featuredRecipe';

type Props = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  onBack: () => void;
  embedded?: boolean;
  onContentChanged?: () => void;
  profilePinAction?: ReactNode;
  profilePath?: string;
  profileLabel?: string;
  profileAvatar?: string | null;
  profileTheme?: string;
  profileCalling?: string;
};

type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdBy?: string | null;
  isHidden?: boolean | null;
  imageUrl?: string | null;
};
type Comment = {
  id: string;
  recipeId: string;
  author: string;
  content: string;
  userId: string;
  isHidden?: boolean | null;
};
type UserProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email?: string | null;
  status?: string | null;
  enabled?: boolean | null;
  isBanned?: boolean | null;
  isDeleted?: boolean | null;
  contentHidden?: boolean | null;
  avatar?: string | null;
};

const errorText = (error: unknown) =>
  getUserFacingErrorMessage(
    error,
    'The admin operation could not be completed. Please try again.'
  );

export default function AdminDashboard({
  isAuthenticated,
  isAdmin,
  onBack,
  embedded = false,
  onContentChanged,
  profilePinAction,
  profilePath = '/discover',
  profileLabel = 'Admin',
  profileAvatar = null,
  profileTheme,
  profileCalling,
}: Props) {
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<'recipes' | 'comments' | 'users'>('recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [recipeForm, setRecipeForm] = useState({ name: '', description: '' });
  const [commentForm, setCommentForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [failedCollections, setFailedCollections] = useState<string[]>([]);
  const loadRequest = useRef(0);
  const actionInFlight = useRef(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmationResolve = useRef<((confirmed: boolean) => void) | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [userListUnavailable, setUserListUnavailable] = useState(false);
  const [pendingUserAction, setPendingUserAction] = useState<string | null>(
    null
  );
  const [transferRecipeId, setTransferRecipeId] = useState('');
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [featuredRecipeId, setFeaturedRecipeId] = useState<string | null>(null);
  const [featureLoaded, setFeatureLoaded] = useState(false);

  const loadContent = useCallback(async () => {
    if (!isAuthenticated || !isAdmin || actionInFlight.current) return;
    const requestId = ++loadRequest.current;
    setLoading(true);
    setError(null);
    const hasAdminUserQuery =
      typeof client.queries?.listAdminUsers === 'function';
    setUserListUnavailable(!hasAdminUserQuery);
    try {
      const [recipeOutcome, commentOutcome, userOutcome, featuredOutcome] =
        await Promise.allSettled([
          readAllAdminPages<Recipe>((nextToken) =>
            client.models.Recipe.list({ authMode: 'userPool', nextToken })
          ).then((data) => ({ data })),
          readAllAdminPages<Comment>((nextToken) =>
            client.models.Comment.list({ authMode: 'userPool', nextToken })
          ).then((data) => ({ data })),
          hasAdminUserQuery
            ? client.queries.listAdminUsers({ authMode: 'userPool' })
            : Promise.resolve({ data: [] }),
          readFeaturedSelection(client, 'userPool'),
        ]);

      if (requestId !== loadRequest.current) return;
      const queryErrors: string[] = [];
      const failed: string[] = [];
      const readResult = (
        outcome: PromiseSettledResult<any>,
        label: string
      ) => {
        if (outcome.status === 'rejected') {
          console.error(`Failed to load admin ${label}:`, outcome.reason);
          failed.push(label.toLowerCase());
          queryErrors.push(`${label}: ${errorText(outcome.reason)}`);
          return null;
        }
        const errors = (outcome.value?.errors ?? [])
          .map((queryError: any) => errorText(queryError))
          .filter(Boolean);
        if (errors.length) {
          console.error(`Failed to load admin ${label}:`, outcome.value.errors);
          failed.push(label.toLowerCase());
          queryErrors.push(`${label}: ${errors.join(', ')}`);
        }
        if (!errors.length && !Array.isArray(outcome.value?.data)) {
          console.error(`Invalid admin ${label} response:`, outcome.value);
          failed.push(label.toLowerCase());
          queryErrors.push(
            `${label}: This collection could not be loaded. Please refresh and try again.`
          );
          return null;
        }
        return errors.length ? null : outcome.value;
      };

      const recipeResult = readResult(recipeOutcome, 'Recipes');
      const commentResult = readResult(commentOutcome, 'Comments');
      const userResult = readResult(userOutcome, 'Users');

      if (featuredOutcome.status === 'fulfilled') {
        setFeaturedRecipeId(featuredOutcome.value?.recipeId || null);
        setFeatureLoaded(true);
      } else {
        console.error(
          'Failed to load featured recipe settings:',
          featuredOutcome.reason
        );
        failed.push('featured recipe');
        queryErrors.push(
          `Featured recipe: ${errorText(featuredOutcome.reason)}`
        );
        setFeatureLoaded(false);
      }

      if (recipeResult) {
        setRecipes((recipeResult.data ?? []) as Recipe[]);
      }
      if (commentResult) {
        setComments((commentResult.data ?? []) as Comment[]);
      }
      if (userResult) {
        setUsers(
          ((userResult.data ?? []) as UserProfile[]).map((user) => ({
            ...user,
            id: user.id || user.userId,
          }))
        );
      }
      if (queryErrors.length) setError(queryErrors.join(', '));
      setFailedCollections(failed);
      if (!failed.length) setLastRefreshed(new Date());
      setLoadedOnce(true);
    } catch (loadError) {
      if (requestId !== loadRequest.current) return;
      console.error('Failed to refresh admin console:', loadError);
      setError(errorText(loadError));
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    void loadContent();
    return () => {
      loadRequest.current += 1;
    };
  }, [loadContent]);

  useEffect(
    () => () => {
      confirmationResolve.current?.(false);
    },
    []
  );

  const confirmAction = (message: string) =>
    new Promise<boolean>((resolve) => {
      if (confirmationResolve.current || actionInFlight.current || loading) {
        resolve(false);
        return;
      }
      confirmationResolve.current = resolve;
      setConfirmation(message);
    });
  const resolveConfirmation = (confirmed: boolean) => {
    confirmationResolve.current?.(confirmed);
    confirmationResolve.current = null;
    setConfirmation(null);
  };

  const runAction = async (
    key: string,
    message: string,
    action: () => Promise<void>
  ) => {
    if (actionInFlight.current || loading || !isAuthenticated || !isAdmin)
      return;
    actionInFlight.current = true;
    setPendingUserAction(key);
    setError(null);
    setSuccess('');
    try {
      await action();
      setSuccess(message);
      onContentChanged?.();
    } catch (operationError) {
      console.error('Admin action failed:', operationError);
      setError(errorText(operationError));
    } finally {
      actionInFlight.current = false;
      setPendingUserAction(null);
    }
  };

  const featureRecipe = async (recipeId: string | null) => {
    if (!featureLoaded) return;
    await runAction(
      'featuredRecipe',
      recipeId ? 'Featured recipe updated.' : 'Featured recipe cleared.',
      async () => {
        await saveFeaturedRecipe(client, recipeId);
        setFeaturedRecipeId(recipeId);
      }
    );
  };

  const removeRecipe = async (recipe: Recipe) => {
    if (
      !(await confirmAction(
        `ADMIN ACTION: permanently delete “${recipe.name}” for everyone?`
      ))
    )
      return;
    await runAction(
      `deleteRecipe:${recipe.id}`,
      `Deleted “${recipe.name}”.`,
      async () => {
        requireAdminResult(
          await client.models.Recipe.delete(
            { id: recipe.id },
            { authMode: 'userPool' }
          )
        );
        setRecipes((current) =>
          current.filter((entry) => entry.id !== recipe.id)
        );
      }
    );
  };

  const saveRecipe = async () => {
    if (!editingRecipe || !recipeForm.name.trim()) return;
    await runAction(
      `saveRecipe:${editingRecipe.id}`,
      'Recipe changes saved.',
      async () => {
        const result = await client.models.Recipe.update(
          {
            id: editingRecipe.id,
            name: recipeForm.name.trim(),
            description: recipeForm.description.trim() || null,
          },
          { authMode: 'userPool' }
        );
        const updated = requireAdminResult<Recipe>(result);
        setRecipes((current) =>
          current.map((entry) =>
            entry.id === updated.id ? { ...entry, ...updated } : entry
          )
        );
        setEditingRecipe(null);
      }
    );
  };

  const removeComment = async (comment: Comment) => {
    if (
      !(await confirmAction(
        'ADMIN ACTION: permanently delete this comment for everyone?'
      ))
    )
      return;
    await runAction(
      `deleteComment:${comment.id}`,
      'Comment deleted.',
      async () => {
        requireAdminResult(
          await client.models.Comment.delete(
            { id: comment.id },
            { authMode: 'userPool' }
          )
        );
        setComments((current) =>
          current.filter((entry) => entry.id !== comment.id)
        );
      }
    );
  };

  const saveComment = async () => {
    if (!editingComment || !commentForm.trim()) return;
    await runAction(
      `saveComment:${editingComment.id}`,
      'Comment changes saved.',
      async () => {
        const result = await client.models.Comment.update(
          { id: editingComment.id, content: commentForm.trim() },
          { authMode: 'userPool' }
        );
        const updated = requireAdminResult<Comment>(result);
        setComments((current) =>
          current.map((entry) =>
            entry.id === updated.id ? { ...entry, ...updated } : entry
          )
        );
        setEditingComment(null);
      }
    );
  };

  const moderateUser = async (
    user: UserProfile,
    action:
      | 'delete'
      | 'ban'
      | 'unban'
      | 'hideContent'
      | 'restoreContent'
      | 'restore'
  ) => {
    const descriptions = {
      delete: 'disable this user and hide their content',
      ban: 'disable this user and hide their content',
      unban: 're-enable this user without deleting their records',
      hideContent:
        "hide this user's recipes and comments without disabling access",
      restoreContent:
        "restore this user's recipe and comment visibility without changing account access",
      restore: 're-enable this user and restore their content visibility',
    };
    if (
      !(await confirmAction(
        `ADMIN ACTION: ${descriptions[action]}?\n\nUser: @${user.username} (${user.userId})`
      ))
    )
      return;
    await runAction(
      `${action}:${user.userId}`,
      `Updated moderation for ${user.username || user.displayName}.`,
      async () => {
        const result = await client.mutations.adminActions(
          { action, userId: user.userId },
          { authMode: 'userPool' }
        );
        const outcome = requireAdminResult<{
          success: boolean;
          message?: string;
        }>(result);
        if (!outcome.success)
          throw new Error(
            outcome.message || 'The operation could not be completed.'
          );
        setUsers((current) =>
          current.map((entry) =>
            entry.userId === user.userId
              ? {
                  ...entry,
                  enabled:
                    action === 'ban' || action === 'delete'
                      ? false
                      : action === 'unban' || action === 'restore'
                        ? true
                        : entry.enabled,
                  isBanned:
                    action === 'ban'
                      ? true
                      : action === 'unban' || action === 'restore'
                        ? false
                        : entry.isBanned,
                  isDeleted:
                    action === 'delete'
                      ? true
                      : action === 'restore'
                        ? false
                        : entry.isDeleted,
                  contentHidden: ['ban', 'delete', 'hideContent'].includes(
                    action
                  )
                    ? true
                    : action === 'restoreContent' || action === 'restore'
                      ? false
                      : entry.contentHidden,
                }
              : entry
          )
        );
        const hidden = ['ban', 'delete', 'hideContent'].includes(action)
          ? true
          : ['restoreContent', 'restore'].includes(action)
            ? false
            : undefined;
        if (hidden !== undefined) {
          setRecipes((current) =>
            current.map((entry) =>
              entry.ownerId === user.userId
                ? { ...entry, isHidden: hidden }
                : entry
            )
          );
          setComments((current) =>
            current.map((entry) =>
              entry.userId === user.userId
                ? { ...entry, isHidden: hidden }
                : entry
            )
          );
        }
      }
    );
  };

  const transferOwnership = async () => {
    if (!transferRecipeId || !transferOwnerId) return;
    const recipe = recipes.find((entry) => entry.id === transferRecipeId);
    const destination = users.find((entry) => entry.userId === transferOwnerId);
    if (!recipe || !destination) return;
    if (
      !(await confirmAction(
        `ADMIN ACTION: transfer “${recipe.name}” from ${recipe.ownerId} to @${destination.username} (${destination.userId})?`
      ))
    )
      return;
    await runAction(
      'transferOwnership',
      `Transferred “${recipe.name}” to ${destination.username}.`,
      async () => {
        const result = await client.mutations.adminActions(
          {
            action: 'transferOwnership',
            transfers: [
              { recipeId: recipe.id, newOwnerId: destination.userId },
            ],
          },
          { authMode: 'userPool' }
        );
        const outcome = requireAdminResult<{
          success: boolean;
          message?: string;
        }>(result);
        if (!outcome.success)
          throw new Error(
            outcome.message || 'Ownership transfer could not be completed.'
          );
        setRecipes((current) =>
          current.map((entry) =>
            entry.id === recipe.id
              ? {
                  ...entry,
                  ownerId: destination.userId,
                  createdBy: `@${destination.username}`,
                }
              : entry
          )
        );
        setTransferRecipeId('');
        setTransferOwnerId('');
      }
    );
  };

  const ownerById = useMemo(
    () => new Map(users.map((user) => [user.userId, user])),
    [users]
  );
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) => {
        const owner = ownerById.get(recipe.ownerId);
        return (
          (statusFilter === 'All' ||
            (statusFilter === 'Hidden') === Boolean(recipe.isHidden)) &&
          matchesAdminSearch(
            search,
            recipe.name,
            recipe.description,
            recipe.id,
            recipe.ownerId,
            recipe.createdBy,
            owner?.username,
            owner?.displayName
          )
        );
      }),
    [recipes, ownerById, search, statusFilter]
  );
  const filteredComments = useMemo(
    () =>
      comments.filter(
        (comment) =>
          (statusFilter === 'All' ||
            (statusFilter === 'Hidden') === Boolean(comment.isHidden)) &&
          matchesAdminSearch(
            search,
            comment.content,
            comment.author,
            comment.recipeId,
            comment.userId,
            comment.id
          )
      ),
    [comments, search, statusFilter]
  );
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          (statusFilter === 'All' ||
            userModerationStatus(user) === statusFilter) &&
          matchesAdminSearch(
            search,
            user.displayName,
            user.username,
            user.email,
            user.userId,
            user.status
          )
      ),
    [users, search, statusFilter]
  );
  const total =
    tab === 'recipes'
      ? recipes.length
      : tab === 'comments'
        ? comments.length
        : users.length;
  const filteredCount =
    tab === 'recipes'
      ? filteredRecipes.length
      : tab === 'comments'
        ? filteredComments.length
        : filteredUsers.length;
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const selectTab = (next: typeof tab) => {
    setTab(next);
    setSearch('');
    setStatusFilter('All');
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPage(1);
  };
  const contentUnavailable = failedCollections.includes(tab) && !total;
  const featuredRecipe = recipes.find(
    (recipe) => recipe.id === featuredRecipeId && !recipe.isHidden
  );
  const Frame = embedded ? 'section' : 'main';
  const recipeHref = (recipeId: string) => {
    if (!embedded) return `/discover?recipe=${encodeURIComponent(recipeId)}`;
    const params = new URLSearchParams(location.search);
    params.set('recipe', recipeId);
    return `${location.pathname}?${params.toString()}`;
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <Frame
        style={sanctuaryThemeStyle(isAuthenticated ? profileTheme : undefined)}
        className="ak-page-glow flex min-h-dvh flex-col text-[var(--theme-text)]"
      >
        <div className="ak-page-rail ak-workspace flex flex-1 items-center justify-center">
          <section className="ak-panel w-full p-8 text-center">
            <p className="ak-eyebrow text-[var(--theme-accent)]">
              Restricted area
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              Administrator access required
            </h1>
            <p className="mt-3 text-sm text-[var(--theme-text-muted)]">
              {!isAuthenticated
                ? 'Sign in with an administrator account to continue.'
                : 'This account is not a member of the Admins group.'}
            </p>
            <button
              onClick={onBack}
              className="ak-button-primary mt-6 rounded-xl px-5 py-3 text-sm font-semibold"
            >
              Return home
            </button>
          </section>
        </div>
        {!embedded && <WorkspaceFooter />}
      </Frame>
    );
  }

  const collectionNavigation = (
    <nav className="ak-admin-collections" aria-label="Admin collections">
      <CollectionButton
        label="Recipes"
        icon={<BookOpen size={18} aria-hidden="true" />}
        value={recipes.length}
        active={tab === 'recipes'}
        onClick={() => selectTab('recipes')}
        loading={
          !loadedOnce ||
          (failedCollections.includes('recipes') && !recipes.length)
        }
      />
      <CollectionButton
        label="Comments"
        icon={<MessageSquare size={18} aria-hidden="true" />}
        value={comments.length}
        active={tab === 'comments'}
        onClick={() => selectTab('comments')}
        loading={
          !loadedOnce ||
          (failedCollections.includes('comments') && !comments.length)
        }
      />
      <CollectionButton
        label="Users"
        icon={<Users size={18} aria-hidden="true" />}
        value={users.length}
        active={tab === 'users'}
        onClick={() => selectTab('users')}
        loading={
          !loadedOnce ||
          (failedCollections.includes('users') && !users.length) ||
          userListUnavailable
        }
      />
    </nav>
  );

  return (
    <Frame
      style={sanctuaryThemeStyle(profileTheme)}
      id="backrooms-workspace"
      aria-label="Backrooms"
      className={
        embedded
          ? 'ak-admin-embedded'
          : 'ak-admin-page ak-app-shell ak-page-glow flex h-screen h-dvh flex-col overflow-hidden text-[var(--theme-text)]'
      }
    >
      {!embedded && (
        <>
          <a href="#admin-workspace" className="ak-skip-link">
            Skip to admin content
          </a>
          <WorkspaceHeader
            onHome={onBack}
            homeLabel="Go to the Emporium"
            profilePath={profilePath}
            profileLabel={profileLabel}
            profileAvatar={profileAvatar}
            isAuthenticated={isAuthenticated}
            adminWorkspace
          />
        </>
      )}

      <div
        id="admin-workspace"
        tabIndex={-1}
        className={
          embedded
            ? 'ak-admin-embedded-content'
            : 'ak-admin-scroll min-h-0 flex-1 overflow-y-auto'
        }
      >
        <div
          className={
            embedded
              ? 'ak-admin-workspace'
              : 'ak-page-rail ak-admin-workspace ak-workspace'
          }
        >
          {!embedded && (
            <div className="ak-admin-banner">
              <SanctuaryHeading
                title="Backrooms"
                callingId={kitchenCalling(profileCalling || 'kitchen-witch').id}
                actions={
                  <button
                    type="button"
                    onClick={onBack}
                    className="ak-banner-action"
                  >
                    <ArrowLeft size={15} aria-hidden="true" /> Back to recipes
                  </button>
                }
              />
            </div>
          )}
          {!embedded && collectionNavigation}
          {error && (
            <div role="alert" className="ak-admin-notice ak-admin-notice-error">
              {error}
              {failedCollections.length > 0 && (
                <p className="mt-2">
                  Previously loaded records are kept where available. Use
                  Refresh to try again.
                </p>
              )}
            </div>
          )}
          <div
            className={`ak-admin-layout ${tab === 'recipes' ? 'has-sidebar' : ''}`}
          >
            <section
              id="admin-results"
              className="ak-panel ak-admin-results"
              aria-label={`${tab} collection`}
            >
              {success && (
                <div
                  role="status"
                  className="ak-admin-notice ak-admin-notice-success"
                >
                  <CheckCircle2
                    size={17}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span>{success}</span>
                  <button
                    type="button"
                    onClick={() => setSuccess('')}
                    aria-label="Dismiss confirmation"
                    className="ak-button-ghost rounded-lg p-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="ak-admin-collection-heading">
                <div className="ak-admin-collection-toolbar">
                  {embedded && collectionNavigation}
                  <h2 className={embedded ? 'sr-only' : 'text-2xl capitalize'}>
                    {tab}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                    {lastRefreshed
                      ? `Last refreshed ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Live community records'}{' '}
                  </p>
                </div>
                <button
                  onClick={() => void loadContent()}
                  aria-label={loading ? 'Refreshing...' : 'Refresh'}
                  disabled={loading || pendingUserAction !== null}
                  className="ak-button-secondary ak-admin-refresh disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? 'animate-spin' : ''}
                    aria-hidden="true"
                  />
                  <span className="ak-admin-refresh-label">
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </span>
                </button>
              </div>
              <div className="ak-admin-search-row">
                <label className="ak-input ak-admin-search">
                  <Search
                    className="h-4 w-4 shrink-0 text-[var(--theme-text-muted)]"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Search {tab}</span>
                  <input
                    aria-label={`Search ${tab}`}
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder={
                      tab === 'users'
                        ? 'Name, handle, email, or user ID'
                        : tab === 'recipes'
                          ? 'Recipe, author, or ID'
                          : 'Comment, author, recipe ID, or user ID'
                    }
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearch('');
                        setPage(1);
                      }}
                      className="ak-button-ghost rounded-lg p-2"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </label>
                <label className="ak-admin-filter">
                  <span>
                    {tab === 'users' ? 'Account state' : 'Visibility'}
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className="ak-input"
                  >
                    {(tab === 'users'
                      ? [
                          'All',
                          'Active',
                          'Banned',
                          'Disabled',
                          'Content hidden',
                          'Deleted',
                        ]
                      : ['All', 'Visible', 'Hidden']
                    ).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              {pendingUserAction && (
                <p
                  role="status"
                  className="mt-4 text-sm text-[var(--theme-accent)]"
                >
                  Applying changes…
                </p>
              )}
              {loading && (
                <p
                  role="status"
                  className="mt-4 text-sm text-[var(--theme-text-muted)]"
                >
                  {loadedOnce
                    ? 'Refreshing collections…'
                    : 'Loading admin workspace…'}
                </p>
              )}
              {loadedOnce && !contentUnavailable && (
                <p className="ak-admin-result-count">
                  {filteredCount} of {total} {tab}
                  {(search || statusFilter !== 'All') && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-3 font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                    >
                      Clear filters
                    </button>
                  )}
                </p>
              )}
              {contentUnavailable ? (
                <div className="ak-empty-state">
                  <h3 className="text-xl">
                    This collection couldn’t be loaded
                  </h3>
                  <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
                    Refresh to try again.
                  </p>
                </div>
              ) : loadedOnce &&
                !filteredCount &&
                (search || statusFilter !== 'All') ? (
                <div className="ak-empty-state">
                  <h3 className="text-xl">No matching {tab}</h3>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ak-button-secondary mt-4 rounded-xl px-4 py-2 text-sm"
                  >
                    Show all {tab}
                  </button>
                </div>
              ) : (
                <fieldset
                  disabled={pendingUserAction !== null || loading}
                  className="min-w-0"
                >
                  {tab === 'recipes' && (
                    <RecipeList
                      recipes={filteredRecipes.slice(start, start + pageSize)}
                      editingRecipe={editingRecipe}
                      recipeForm={recipeForm}
                      setEditingRecipe={setEditingRecipe}
                      setRecipeForm={setRecipeForm}
                      saveRecipe={saveRecipe}
                      removeRecipe={removeRecipe}
                      onFeature={featureRecipe}
                      featuredRecipeId={featuredRecipeId}
                      featureLoaded={featureLoaded}
                      owners={ownerById}
                      recipeHref={recipeHref}
                      loading={loading || !loadedOnce}
                    />
                  )}
                  {tab === 'comments' && (
                    <CommentList
                      comments={filteredComments.slice(start, start + pageSize)}
                      editingComment={editingComment}
                      commentForm={commentForm}
                      setEditingComment={setEditingComment}
                      setCommentForm={setCommentForm}
                      saveComment={saveComment}
                      removeComment={removeComment}
                      owners={ownerById}
                      recipeHref={recipeHref}
                      loading={loading || !loadedOnce}
                    />
                  )}
                  {tab === 'users' && (
                    <UserTable
                      users={filteredUsers.slice(start, start + pageSize)}
                      loading={loading || !loadedOnce}
                      unavailable={userListUnavailable}
                      onModerateUser={moderateUser}
                      pendingUserAction={pendingUserAction}
                    />
                  )}
                </fieldset>
              )}
              {loadedOnce && filteredCount > 0 && (
                <nav
                  aria-label="Collection pages"
                  className="ak-admin-pagination"
                >
                  <p className="text-[var(--theme-text-muted)]">
                    Showing {start + 1}–
                    {Math.min(start + pageSize, filteredCount)} of{' '}
                    {filteredCount}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Previous page"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="ak-button-secondary rounded-lg p-2 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>
                      Page {currentPage} of {pages}
                    </span>
                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={currentPage >= pages}
                      onClick={() => setPage(currentPage + 1)}
                      className="ak-button-secondary rounded-lg p-2 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </nav>
              )}
            </section>
            {tab === 'recipes' && (
              <aside
                className="ak-admin-sidebar"
                aria-label="Recipe administration"
              >
                <section
                  className="ak-panel ak-admin-feature"
                  aria-label="Featured recipe settings"
                >
                  <div className="ak-admin-aside-heading">
                    <Sparkles size={16} aria-hidden="true" />
                    <h2>Featured recipe</h2>
                  </div>
                  {featureLoaded && featuredRecipe && (
                    <Link
                      to={recipeHref(featuredRecipe.id)}
                      className="ak-admin-feature-photo"
                      aria-label={`Open featured recipe: ${featuredRecipe.name}`}
                    >
                      <RecipePhoto
                        imageUrl={featuredRecipe.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  )}
                  <div className="ak-admin-feature-body">
                    <p className="ak-admin-feature-name">
                      {!featureLoaded
                        ? loading
                          ? 'Loading featured recipe…'
                          : 'Featured recipe settings are unavailable.'
                        : featuredRecipeId
                          ? featuredRecipe?.name ||
                            'The selected recipe is unavailable.'
                          : 'No recipe is currently featured.'}
                    </p>
                    <p className="ak-admin-aside-help">
                      Choose Feature on a recipe to update this spot.
                    </p>
                    <button
                      type="button"
                      onClick={() => void featureRecipe(null)}
                      disabled={
                        !featureLoaded ||
                        !featuredRecipeId ||
                        loading ||
                        pendingUserAction !== null
                      }
                      className="ak-button-secondary ak-admin-clear-feature disabled:opacity-50"
                    >
                      Clear featured recipe
                    </button>
                  </div>
                </section>
                {profilePinAction && (
                  <fieldset
                    className="ak-admin-profile-action"
                    disabled={loading || pendingUserAction !== null}
                  >
                    <legend className="ak-eyebrow">Your profile</legend>
                    {profilePinAction}
                  </fieldset>
                )}
                <section className="ak-panel ak-admin-transfer">
                  <fieldset
                    className="min-w-0"
                    disabled={pendingUserAction !== null || loading}
                  >
                    <div className="ak-admin-aside-heading">
                      <ArrowRightLeft size={16} aria-hidden="true" />
                      <h2>Ownership transfer</h2>
                    </div>
                    <p className="ak-admin-aside-help">
                      Assign a recipe to another cook.
                    </p>
                    <div className="ak-admin-transfer-fields">
                      <label>
                        Recipe
                        <select
                          aria-label="Recipe to transfer"
                          value={transferRecipeId}
                          onChange={(event) =>
                            setTransferRecipeId(event.target.value)
                          }
                          className="ak-input"
                        >
                          <option value="">Select a recipe</option>
                          {recipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name} · {recipe.ownerId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        New owner
                        <select
                          aria-label="Destination user"
                          value={transferOwnerId}
                          onChange={(event) =>
                            setTransferOwnerId(event.target.value)
                          }
                          className="ak-input"
                        >
                          <option value="">Select a destination user</option>
                          {users.map((user) => (
                            <option key={user.userId} value={user.userId}>
                              {user.displayName} · {user.userId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => void transferOwnership()}
                        disabled={
                          !transferRecipeId ||
                          !transferOwnerId ||
                          pendingUserAction !== null
                        }
                        className="ak-button-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
                      >
                        {pendingUserAction === 'transferOwnership'
                          ? 'Transferring...'
                          : 'Transfer ownership'}
                      </button>
                    </div>
                  </fieldset>
                </section>
              </aside>
            )}
          </div>
        </div>
      </div>
      {!embedded && <WorkspaceFooter />}
      {confirmation && (
        <AccessibleDialog
          label="Confirm admin action"
          onClose={() => resolveConfirmation(false)}
        >
          <section className="ak-panel mx-auto my-12 max-w-lg p-6 sm:p-8">
            <ShieldCheck
              className="mb-4 h-8 w-8 text-[var(--theme-accent)]"
              aria-hidden="true"
            />
            <p className="ak-eyebrow text-[var(--theme-accent)]">
              Administrator action
            </p>
            <h2 className="mt-2 text-2xl">Confirm this change</h2>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--theme-text-muted)]">
              {confirmation}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => resolveConfirmation(false)}
                className="ak-button-secondary rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => resolveConfirmation(true)}
                className="ak-button-danger rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Confirm action
              </button>
            </div>
          </section>
        </AccessibleDialog>
      )}
    </Frame>
  );
}

function CollectionButton({
  label,
  icon,
  value,
  active,
  onClick,
  loading,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  active: boolean;
  onClick: () => void;
  loading?: boolean;
}) {
  const [activeColor, setActiveColor] = useState(randomMerlinColor);

  return (
    <button
      type="button"
      onClick={() => {
        setActiveColor(randomMerlinColor());
        onClick();
      }}
      aria-pressed={active}
      aria-controls="admin-results"
      style={
        active
          ? { color: activeColor, borderBottomColor: activeColor }
          : undefined
      }
      className={`ak-admin-tab ${active ? 'is-active' : ''}`}
    >
      {icon}
      <span>{label}</span>
      <span className="ak-admin-tab-count">{loading ? '—' : value}</span>
    </button>
  );
}

function RecipeList({
  recipes,
  editingRecipe,
  recipeForm,
  setEditingRecipe,
  setRecipeForm,
  saveRecipe,
  removeRecipe,
  onFeature,
  featuredRecipeId,
  featureLoaded,
  owners,
  recipeHref,
  loading,
}: any) {
  return (
    <div className="ak-admin-records">
      {recipes.map((recipe: Recipe) => (
        <article
          key={recipe.id}
          className="ak-admin-record ak-admin-recipe-record"
        >
          {editingRecipe?.id === recipe.id ? (
            <div className="ak-admin-edit-form">
              <label>
                Recipe name
                <input
                  value={recipeForm.name}
                  onChange={(event) =>
                    setRecipeForm({ ...recipeForm, name: event.target.value })
                  }
                  aria-label="Recipe name"
                  className="ak-input"
                />
              </label>
              <label>
                Description
                <textarea
                  value={recipeForm.description}
                  onChange={(event) =>
                    setRecipeForm({
                      ...recipeForm,
                      description: event.target.value,
                    })
                  }
                  aria-label="Recipe description"
                  className="ak-input min-h-24 resize-y"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => void saveRecipe()}
                  className="ak-button-primary rounded-xl px-4 py-2.5 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingRecipe(null)}
                  className="ak-button-secondary rounded-xl px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="ak-admin-recipe-layout">
              <Link
                to={recipeHref(recipe.id)}
                className="ak-admin-recipe-photo"
                aria-label={`Open ${recipe.name}`}
              >
                <RecipePhoto
                  imageUrl={recipe.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="ak-admin-record-body">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="ak-admin-record-title">{recipe.name}</h3>
                  <VisibilityBadge hidden={recipe.isHidden} />
                </div>
                <p className="ak-admin-record-description">
                  {recipe.description || 'No description'}
                </p>
                <p className="ak-admin-record-owner">
                  {recipe.createdBy && <span>by {recipe.createdBy}</span>}
                  <span title={recipe.ownerId}>
                    Owner:{' '}
                    {owners?.get(recipe.ownerId)?.username || recipe.ownerId}
                  </span>
                </p>
                <Link
                  to={recipeHref(recipe.id)}
                  className="ak-admin-record-link"
                >
                  View recipe <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
              <div className="ak-admin-record-actions">
                <button
                  type="button"
                  onClick={() => void onFeature(recipe.id)}
                  disabled={
                    !featureLoaded ||
                    loading ||
                    Boolean(recipe.isHidden) ||
                    featuredRecipeId === recipe.id
                  }
                  aria-label={`Feature ${recipe.name}`}
                  aria-pressed={featuredRecipeId === recipe.id}
                  className="ak-button-secondary ak-admin-feature-action disabled:opacity-50"
                >
                  <Sparkles size={14} aria-hidden="true" />
                  {featuredRecipeId === recipe.id ? 'Featured' : 'Feature'}
                </button>
                <button
                  onClick={() => {
                    setEditingRecipe(recipe);
                    setRecipeForm({
                      name: recipe.name,
                      description: recipe.description || '',
                    });
                  }}
                  className="ak-button-secondary rounded-xl px-3 py-2 text-sm"
                >
                  <Pencil size={13} aria-hidden="true" /> Edit
                </button>
                <button
                  onClick={() => void removeRecipe(recipe)}
                  className="ak-button-danger-soft rounded-xl px-3 py-2 text-sm"
                >
                  <Trash2 size={13} aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {!recipes.length && !loading && (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">
          No recipes found.
        </p>
      )}
    </div>
  );
}

function CommentList({
  comments,
  editingComment,
  commentForm,
  setEditingComment,
  setCommentForm,
  saveComment,
  removeComment,
  owners,
  recipeHref,
  loading,
}: any) {
  return (
    <div className="ak-admin-records">
      {comments.map((comment: Comment) => (
        <article
          key={comment.id}
          className="ak-admin-record ak-admin-comment-record"
        >
          {editingComment?.id === comment.id ? (
            <div className="ak-admin-edit-form">
              <label>
                Comment
                <textarea
                  value={commentForm}
                  onChange={(event) => setCommentForm(event.target.value)}
                  aria-label="Comment content"
                  className="ak-input min-h-24 resize-y"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => void saveComment()}
                  className="ak-button-primary rounded-xl px-4 py-2.5 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingComment(null)}
                  className="ak-button-secondary rounded-xl px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="ak-admin-comment-layout">
              <div className="ak-admin-record-body">
                <div className="ak-admin-comment-identity">
                  <CookAvatar
                    name={comment.author}
                    avatar={owners?.get(comment.userId)?.avatar || undefined}
                  />
                  <p>{comment.author.replace(/^@/, '')}</p>
                  <VisibilityBadge hidden={comment.isHidden} />
                </div>
                <p className="ak-admin-comment-text">{comment.content}</p>
                <p className="ak-admin-record-owner">
                  Recipe: {comment.recipeId} | User: {comment.userId}
                </p>
                <Link
                  to={recipeHref(comment.recipeId)}
                  className="ak-admin-record-link"
                >
                  View conversation{' '}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
              <div className="ak-admin-record-actions">
                <button
                  onClick={() => {
                    setEditingComment(comment);
                    setCommentForm(comment.content);
                  }}
                  className="ak-button-secondary rounded-xl px-3 py-2 text-sm"
                >
                  <Pencil size={13} aria-hidden="true" /> Edit
                </button>
                <button
                  onClick={() => void removeComment(comment)}
                  className="ak-button-danger-soft rounded-xl px-3 py-2 text-sm"
                >
                  <Trash2 size={13} aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {!comments.length && !loading && (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">
          No comments found.
        </p>
      )}
    </div>
  );
}

function VisibilityBadge({ hidden }: { hidden?: boolean | null }) {
  return (
    <span
      className={`ak-admin-status ${hidden ? 'is-restricted' : 'is-visible'}`}
    >
      {hidden ? 'Hidden' : 'Visible'}
    </span>
  );
}

function UserTable({
  users,
  loading,
  unavailable,
  onModerateUser,
  pendingUserAction,
}: {
  users: UserProfile[];
  loading: boolean;
  unavailable: boolean;
  onModerateUser: (
    user: UserProfile,
    action:
      | 'delete'
      | 'ban'
      | 'unban'
      | 'hideContent'
      | 'restoreContent'
      | 'restore'
  ) => void;
  pendingUserAction: string | null;
}) {
  if (unavailable) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        The deployed backend does not include the admin Cognito user-list
        operation yet. Deploy the latest Amplify backend and reload this page.
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs text-[var(--theme-text-muted)] md:hidden">
        Scroll the table sideways for account status and actions.
      </p>
      <div
        tabIndex={0}
        role="region"
        aria-label="User management table"
        className="ak-admin-table"
      >
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--theme-surface-alt)] text-xs uppercase text-[var(--theme-text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3">
                User
              </th>
              <th scope="col" className="px-4 py-3">
                User ID
              </th>
              <th scope="col" className="px-4 py-3">
                Cognito status
              </th>
              <th scope="col" className="px-4 py-3">
                Moderation
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-[var(--theme-border)]"
              >
                <td className="px-4 py-3">
                  <div className="ak-admin-user-identity">
                    <CookAvatar
                      name={user.displayName || user.username}
                      avatar={user.avatar || undefined}
                    />
                    <div>
                      <div className="font-semibold">
                        {user.displayName || user.username}
                      </div>
                      {user.displayName &&
                        user.displayName !== user.username && (
                          <div className="text-xs text-[var(--theme-accent)]">
                            {user.username}
                          </div>
                        )}
                      {user.email && (
                        <div className="text-[var(--theme-text-muted)]">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-muted)]">
                  {user.userId}
                </td>
                <td className="px-4 py-3">
                  {user.status || 'UNKNOWN'}
                  {user.enabled === false ? ' · Disabled' : ''}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`ak-admin-status ${userModerationStatus(user) === 'Active' ? 'is-visible' : 'is-restricted'}`}
                  >
                    {userModerationStatus(user)}
                  </span>
                  {user.contentHidden &&
                    userModerationStatus(user) !== 'Content hidden' && (
                      <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                        Content hidden
                      </p>
                    )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-52 flex-wrap gap-2">
                    <button
                      disabled={pendingUserAction !== null}
                      onClick={() =>
                        onModerateUser(user, user.isBanned ? 'unban' : 'ban')
                      }
                      className="ak-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {user.isBanned ? 'Unban' : 'Ban'}
                    </button>
                    <button
                      disabled={pendingUserAction !== null}
                      onClick={() =>
                        onModerateUser(
                          user,
                          user.contentHidden ? 'restoreContent' : 'hideContent'
                        )
                      }
                      className="ak-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {user.contentHidden ? 'Restore content' : 'Hide content'}
                    </button>
                    <button
                      disabled={pendingUserAction !== null}
                      onClick={() =>
                        onModerateUser(
                          user,
                          user.isDeleted ? 'restore' : 'delete'
                        )
                      }
                      className="ak-button-danger-soft rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {user.isDeleted ? 'Restore user' : 'Delete user'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && !loading && (
          <p className="p-8 text-center text-sm text-[var(--theme-text-muted)]">
            No Cognito users found.
          </p>
        )}
      </div>
    </div>
  );
}
