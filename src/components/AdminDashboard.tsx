import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import { Link } from 'react-router-dom';
import {
  matchesAdminSearch,
  readAllAdminPages,
  requireAdminResult,
  userModerationStatus,
} from '../utils/adminConsole';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { randomMerlinColor } from '../theme/merlinPalette';
import ProfileDropdown from './ProfileDropdown';
import SanctuaryHeading from './ui/SanctuaryHeading';
import { sanctuaryThemeStyle } from '../theme/sanctuaryTheme';
import { getUserFacingErrorMessage } from '../utils/userFacingErrors';

const client: any = generateClient<Schema>();

type Props = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onSignOut?: () => void;
  profilePath?: string;
  profileLabel?: string;
  profileAvatar?: string | null;
  profileTheme?: string;
};

type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdBy?: string | null;
  isHidden?: boolean | null;
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
  onSignOut,
  profilePath = '/discover',
  profileLabel = 'Admin',
  profileAvatar = null,
  profileTheme,
}: Props) {
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

  const loadContent = useCallback(async () => {
    if (!isAuthenticated || !isAdmin || actionInFlight.current) return;
    const requestId = ++loadRequest.current;
    setLoading(true);
    setError(null);
    const hasAdminUserQuery =
      typeof client.queries?.listAdminUsers === 'function';
    setUserListUnavailable(!hasAdminUserQuery);
    try {
      const [recipeOutcome, commentOutcome, userOutcome] =
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
    } catch (operationError) {
      console.error('Admin action failed:', operationError);
      setError(errorText(operationError));
    } finally {
      actionInFlight.current = false;
      setPendingUserAction(null);
    }
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

  if (!isAuthenticated || !isAdmin) {
    return (
      <main
        style={sanctuaryThemeStyle(isAuthenticated ? profileTheme : undefined)}
        className="flex min-h-screen items-center justify-center bg-[var(--theme-bg)] p-6 text-[var(--theme-text)]"
      >
        <section className="ak-panel w-full max-w-lg p-8 text-center">
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
      </main>
    );
  }

  return (
    <main
      style={sanctuaryThemeStyle(profileTheme)}
      className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]"
    >
      <header className="sticky top-0 z-20 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-1 sm:px-8">
          <button
            onClick={onBack}
            aria-label="Go to Discover"
            className="flex items-center gap-2 rounded-md p-0.5 transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
          >
            <img
              src="/logo-no-background.svg"
              alt=""
              draggable={false}
              className="h-14 w-14 object-contain brightness-[0.3]"
            />
            <span className="font-heading text-base font-semibold">
              Arcane Kitchen
            </span>
          </button>
          <span className="absolute left-1/2 hidden -translate-x-1/2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)] md:block">
            Admin dashboard
          </span>
          <ProfileDropdown
            profilePath={profilePath}
            profileLabel={profileLabel}
            profileAvatar={profileAvatar}
            isAdmin={isAdmin}
            onSignOut={onSignOut || (() => undefined)}
          />
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <SanctuaryHeading
            eyebrow="Community stewardship"
            title="Moderation desk"
            description="Find a recipe, follow a conversation, or look after the cooks in your community."
          />
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
            <Stat
              label="Recipes"
              value={recipes.length}
              active={tab === 'recipes'}
              onClick={() => selectTab('recipes')}
              loading={
                !loadedOnce ||
                (failedCollections.includes('recipes') && !recipes.length)
              }
            />
            <Stat
              label="Comments"
              value={comments.length}
              active={tab === 'comments'}
              onClick={() => selectTab('comments')}
              loading={
                !loadedOnce ||
                (failedCollections.includes('comments') && !comments.length)
              }
            />
            <Stat
              label="Users"
              value={users.length}
              active={tab === 'users'}
              onClick={() => selectTab('users')}
              loading={
                !loadedOnce ||
                (failedCollections.includes('users') && !users.length) ||
                userListUnavailable
              }
            />
          </div>
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
              {failedCollections.length > 0 && (
                <p className="mt-2">
                  Previously loaded records are kept where available. Use
                  Refresh to try again.
                </p>
              )}
            </div>
          )}
          <section className="ak-panel mt-6 p-4 sm:p-6">
            {success && (
              <div
                role="status"
                className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
              >
                <span>{success}</span>
                <button
                  type="button"
                  onClick={() => setSuccess('')}
                  aria-label="Dismiss confirmation"
                  className="rounded-lg p-2"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl capitalize">{tab}</h2>
                <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                  {lastRefreshed
                    ? `Last refreshed ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Live community records'}{' '}
                  · Admin access
                </p>
              </div>
              <button
                onClick={() => void loadContent()}
                disabled={loading || pendingUserAction !== null}
                className="ak-button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className="ak-input flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3">
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
                    className="rounded-lg p-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--theme-text-muted)]">
                <span>{tab === 'users' ? 'Account state' : 'Visibility'}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="ak-input min-h-11 rounded-xl px-3 py-2"
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
              <p className="mt-4 text-xs text-[var(--theme-text-muted)]">
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
                <h3 className="text-xl">This collection couldn’t be loaded</h3>
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
                className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-4 text-sm"
              >
                <p className="text-[var(--theme-text-muted)]">
                  Showing {start + 1}–
                  {Math.min(start + pageSize, filteredCount)} of {filteredCount}
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
            <section className="ak-panel mt-6 p-6">
              <fieldset disabled={pendingUserAction !== null || loading}>
                <h2 className="text-xl font-semibold">Ownership transfer</h2>
                <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
                  Assign a recipe to another cook. Its author attribution will
                  follow the new owner.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <select
                    aria-label="Recipe to transfer"
                    value={transferRecipeId}
                    onChange={(event) =>
                      setTransferRecipeId(event.target.value)
                    }
                    className="ak-input min-w-0 rounded-xl px-3 py-3 text-sm"
                  >
                    <option value="">Select a recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} · {recipe.ownerId}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Destination user"
                    value={transferOwnerId}
                    onChange={(event) => setTransferOwnerId(event.target.value)}
                    className="ak-input min-w-0 rounded-xl px-3 py-3 text-sm"
                  >
                    <option value="">Select a destination user</option>
                    {users.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.displayName} · {user.userId}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void transferOwnership()}
                    disabled={
                      !transferRecipeId ||
                      !transferOwnerId ||
                      pendingUserAction !== null
                    }
                    className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {pendingUserAction === 'transferOwnership'
                      ? 'Transferring...'
                      : 'Transfer ownership'}
                  </button>
                </div>
              </fieldset>
            </section>
          )}
        </div>
      </div>
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
    </main>
  );
}

function Stat({
  label,
  value,
  active,
  onClick,
  loading,
}: {
  label: string;
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
      style={
        active
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : undefined
      }
      className={`rounded-2xl border p-3 text-left transition sm:p-4 ${active ? 'text-white shadow-lg' : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-accent)]'}`}
    >
      <p
        className={`text-xs uppercase ${active ? 'text-white/80' : 'text-[var(--theme-text-muted)]'}`}
      >
        {label}
      </p>
      <p className="mt-2 text-3xl font-heading font-semibold">
        {loading ? '—' : value}
      </p>
      <p
        className={`mt-1 hidden text-xs sm:block ${active ? 'text-white/80' : 'text-[var(--theme-text-muted)]'}`}
      >
        View {label.toLowerCase()}
      </p>
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
  loading,
}: any) {
  return (
    <div className="mt-5 space-y-3">
      {recipes.map((recipe: Recipe) => (
        <article
          key={recipe.id}
          className="rounded-2xl border border-[var(--theme-border)] p-4"
        >
          {editingRecipe?.id === recipe.id ? (
            <div className="grid gap-3">
              <input
                value={recipeForm.name}
                onChange={(event) =>
                  setRecipeForm({ ...recipeForm, name: event.target.value })
                }
                aria-label="Recipe name"
                className="rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2"
              />
              <textarea
                value={recipeForm.description}
                onChange={(event) =>
                  setRecipeForm({
                    ...recipeForm,
                    description: event.target.value,
                  })
                }
                aria-label="Recipe description"
                className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void saveRecipe()}
                  className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingRecipe(null)}
                  className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-xl font-semibold">
                    {recipe.name}
                  </h3>
                  <VisibilityBadge hidden={recipe.isHidden} />
                </div>
                <p className="mt-1 break-all text-xs text-[var(--theme-text-muted)]">
                  Owner: {recipe.ownerId}
                </p>
                <p className="mt-2 break-words text-sm text-[var(--theme-text-muted)]">
                  {recipe.description || 'No description'}
                </p>
                <Link
                  to={`/discover?recipe=${encodeURIComponent(recipe.id)}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                >
                  View recipe
                </Link>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => {
                    setEditingRecipe(recipe);
                    setRecipeForm({
                      name: recipe.name,
                      description: recipe.description || '',
                    });
                  }}
                  className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text-muted)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => void removeRecipe(recipe)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                >
                  Delete
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
  loading,
}: any) {
  return (
    <div className="mt-5 space-y-3">
      {comments.map((comment: Comment) => (
        <article
          key={comment.id}
          className="rounded-2xl border border-[var(--theme-border)] p-4"
        >
          {editingComment?.id === comment.id ? (
            <div className="grid gap-3">
              <textarea
                value={commentForm}
                onChange={(event) => setCommentForm(event.target.value)}
                aria-label="Comment content"
                className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void saveComment()}
                  className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingComment(null)}
                  className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{comment.author}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  {comment.content}
                </p>
                <div className="mt-3">
                  <VisibilityBadge hidden={comment.isHidden} />
                </div>
                <p className="mt-2 break-all text-xs text-[var(--theme-text-muted)]">
                  Recipe: {comment.recipeId} | User: {comment.userId}
                </p>
                <Link
                  to={`/discover?recipe=${encodeURIComponent(comment.recipeId)}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                >
                  View conversation
                </Link>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingComment(comment);
                    setCommentForm(comment.content);
                  }}
                  className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text-muted)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => void removeComment(comment)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                >
                  Delete
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${hidden ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
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
        className="max-h-[32rem] overflow-auto rounded-2xl border border-[var(--theme-border)]"
      >
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--theme-surface-alt)] text-xs uppercase text-[var(--theme-text-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Cognito status</th>
              <th className="px-4 py-3">Moderation</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-[var(--theme-border)]"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-xs text-[var(--theme-accent)]">
                    {user.username}
                  </div>
                  <div className="text-[var(--theme-text-muted)]">
                    {user.email || user.username}
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
                    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${userModerationStatus(user) === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
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
                      className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)] disabled:opacity-50"
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
                      className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)] disabled:opacity-50"
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
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
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
