import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import {
  matchesAdminSearch,
  readAllAdminPages,
  requireAdminResult,
  userModerationStatus,
  adminAuditCategory,
} from '../utils/adminConsole';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import ProfileDropdown from './ProfileDropdown';
import SanctuaryHeading from './ui/SanctuaryHeading';
import { sanctuaryThemeStyle } from '../theme/sanctuaryTheme';
import { getUserFacingErrorMessage } from '../utils/userFacingErrors';
import AdminRail from './admin/AdminRail';
import ActivityPanel from './admin/ActivityPanel';
import RecipesPanel from './admin/RecipesPanel';
import CommentsPanel from './admin/CommentsPanel';
import ReportsPanel from './admin/ReportsPanel';
import UsersPanel from './admin/UsersPanel';
import type {
  AdminRecipe as Recipe,
  AdminComment as Comment,
  AdminUserProfile as UserProfile,
  AdminAuditEntry,
  AdminTab as Tab,
  ModerationAction,
} from './admin/types';

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
  const [tab, setTab] = useState<Tab>('recipes');
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

  const hideRecipe = async (recipe: Recipe) => {
    const nextHidden = !recipe.isHidden;
    await runAction(
      `hideRecipe:${recipe.id}`,
      nextHidden ? `Hid “${recipe.name}”.` : `Restored “${recipe.name}”.`,
      async () => {
        const result = await client.models.Recipe.update(
          { id: recipe.id, isHidden: nextHidden },
          { authMode: 'userPool' }
        );
        const updated = requireAdminResult<Recipe>(result);
        setRecipes((current) =>
          current.map((entry) =>
            entry.id === updated.id
              ? { ...entry, isHidden: updated.isHidden ?? nextHidden }
              : entry
          )
        );
      }
    );
  };
  const hideComment = async (comment: Comment) => {
    const nextHidden = !comment.isHidden;
    await runAction(
      `hideComment:${comment.id}`,
      nextHidden
        ? `Hid comment by ${comment.author}.`
        : `Restored comment by ${comment.author}.`,
      async () => {
        const result = await client.models.Comment.update(
          { id: comment.id, isHidden: nextHidden },
          { authMode: 'userPool' }
        );
        const updated = requireAdminResult<Comment>(result);
        setComments((current) =>
          current.map((entry) =>
            entry.id === updated.id
              ? { ...entry, isHidden: updated.isHidden ?? nextHidden }
              : entry
          )
        );
      }
    );
  };
  const AUDIT_PAGE_SIZE = 20;
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditNextToken, setAuditNextToken] = useState<string | null>(null);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);
  const [auditRequested, setAuditRequested] = useState(false);
  const [auditUnavailable, setAuditUnavailable] = useState(false);
  const auditRequest = useRef(0);
  const auditMoreInFlight = useRef(false);

  const readAuditPage = useCallback(
    (nextToken?: string) =>
      client.models.AdminAuditLog.list({
        authMode: 'userPool',
        limit: AUDIT_PAGE_SIZE,
        nextToken,
      }),
    []
  );

  const loadAuditLog = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;
    const requestId = ++auditRequest.current;
    setAuditLoading(true);
    try {
      const hasAuditQuery =
        typeof client.models?.AdminAuditLog?.list === 'function';
      if (!hasAuditQuery) {
        if (requestId === auditRequest.current) setAuditUnavailable(true);
        return;
      }
      const result = await readAuditPage();
      if (requestId !== auditRequest.current) return;
      if (result.errors?.length)
        throw new Error(
          result.errors
            .map((error: { message: string }) => error.message)
            .join('; ')
        );
      setAuditUnavailable(false);
      setAuditEntries(Array.isArray(result.data) ? result.data : []);
      setAuditNextToken(result.nextToken || null);
    } catch (loadError) {
      if (requestId !== auditRequest.current) return;
      console.error('Failed to load admin activity log:', loadError);
      setError((current) => current ?? errorText(loadError));
    } finally {
      if (requestId === auditRequest.current) setAuditLoading(false);
    }
  }, [isAuthenticated, isAdmin, readAuditPage]);

  const loadMoreAuditLog = useCallback(async () => {
    if (!auditNextToken || auditMoreInFlight.current) return;
    const requestId = ++auditRequest.current;
    auditMoreInFlight.current = true;
    setAuditLoadingMore(true);
    try {
      const result = await readAuditPage(auditNextToken);
      if (requestId !== auditRequest.current) return;
      if (result.errors?.length)
        throw new Error(
          result.errors
            .map((error: { message: string }) => error.message)
            .join('; ')
        );
      setAuditEntries((current) => [...current, ...(result.data ?? [])]);
      setAuditNextToken(result.nextToken || null);
    } catch (loadError) {
      if (requestId !== auditRequest.current) return;
      console.error('Failed to load more admin activity:', loadError);
      setError((current) => current ?? errorText(loadError));
    } finally {
      auditMoreInFlight.current = false;
      if (requestId === auditRequest.current) setAuditLoadingMore(false);
    }
  }, [auditNextToken, readAuditPage]);

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
            ? (async () => {
                const [userRows, profileRows] = await Promise.all([
                  client.queries.listAdminUsers({ authMode: 'userPool' }),
                  readAllAdminPages<any>((nextToken) =>
                    client.models.UserProfile.list({
                      authMode: 'userPool',
                      nextToken,
                    })
                  ),
                ]);
                const rowErrors = (userRows.errors ?? []).map(
                  (queryError: any) => errorText(queryError)
                );
                if (rowErrors.length)
                  throw new Error(rowErrors.filter(Boolean).join('; '));
                const profileFlags = new Map(
                  profileRows.map((profile: any) => [profile.userId, profile])
                );
                return {
                  data: (userRows.data ?? []).map((user: any) => {
                    const flags = profileFlags.get(user.userId);
                    return {
                      ...user,
                      isBanned: flags?.isBanned ?? false,
                      isDeleted: flags?.isDeleted ?? false,
                      contentHidden: flags?.contentHidden ?? false,
                    };
                  }),
                };
              })()
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

  const [pendingDeleteUser, setPendingDeleteUser] =
    useState<UserProfile | null>(null);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');

  const performModerateUser = async (
    user: UserProfile,
    action: ModerationAction
  ) => {
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

  const moderateUser = async (user: UserProfile, action: ModerationAction) => {
    if (action === 'delete') {
      setDeleteEmailInput('');
      setPendingDeleteUser(user);
      return;
    }
    const descriptions = {
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
    await performModerateUser(user, action);
  };

  const pendingDeleteOwnedCount = pendingDeleteUser
    ? recipes.filter((recipe) => recipe.ownerId === pendingDeleteUser.userId)
        .length
    : 0;
  const pendingDeleteExpected = (
    pendingDeleteUser?.email ||
    pendingDeleteUser?.username ||
    ''
  ).toLowerCase();
  const closeDeleteDialog = () => {
    setPendingDeleteUser(null);
    setDeleteEmailInput('');
  };
  const confirmDeleteUser = async () => {
    const user = pendingDeleteUser;
    if (!user) return;
    closeDeleteDialog();
    await performModerateUser(user, 'delete');
  };
  const reassignBeforeDelete = () => {
    const user = pendingDeleteUser;
    if (!user) return;
    closeDeleteDialog();
    selectTab('recipes');
    setSearch(user.username);
  };

  const transferOwnership = async (
    recipe: Recipe,
    destination: UserProfile
  ) => {
    if (
      !(await confirmAction(
        `ADMIN ACTION: transfer “${recipe.name}” from ${recipe.ownerId} to @${destination.username} (${destination.userId})?`
      ))
    )
      return false;
    let succeeded = false;
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
        succeeded = true;
      }
    );
    return succeeded;
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
  const filteredAudit = useMemo(
    () =>
      auditEntries.filter((entry) => {
        const actor = ownerById.get(entry.actorUserId);
        return (
          (statusFilter === 'All' ||
            adminAuditCategory(entry.action) === statusFilter) &&
          matchesAdminSearch(
            search,
            entry.action,
            entry.targetType,
            entry.targetId,
            actor?.username,
            actor?.displayName
          )
        );
      }),
    [auditEntries, ownerById, search, statusFilter]
  );
  const total =
    tab === 'recipes'
      ? recipes.length
      : tab === 'comments'
        ? comments.length
        : tab === 'users'
          ? users.length
          : tab === 'reports'
            ? 0
            : auditEntries.length;
  const filteredCount =
    tab === 'recipes'
      ? filteredRecipes.length
      : tab === 'comments'
        ? filteredComments.length
        : tab === 'users'
          ? filteredUsers.length
          : tab === 'reports'
            ? 0
            : filteredAudit.length;
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const selectTab = (next: Tab) => {
    setTab(next);
    setSearch('');
    setStatusFilter('All');
    setPage(1);
    if (next === 'activity' && !auditRequested) {
      setAuditRequested(true);
      void loadAuditLog();
    }
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
        className="ak-page-glow flex min-h-screen items-center justify-center p-6 text-[var(--theme-text)]"
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
      className="ak-page-glow min-h-screen text-[var(--theme-text)]"
    >
      <header className="sticky top-0 z-20 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-1 sm:px-8">
          <button
            onClick={onBack}
            aria-label="Go to the Emporium"
            className="ak-logo-button flex items-center gap-2 p-0.5"
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
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            <AdminRail
              active={tab}
              counts={
                loadedOnce && !failedCollections.length
                  ? {
                      recipes: recipes.length,
                      comments: comments.length,
                      users: users.length,
                    }
                  : {}
              }
              onSelect={selectTab}
            />
            <div className="min-w-0 flex-1">
              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
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
              <section className="ak-panel p-4 sm:p-6">
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
                      className="ak-button-ghost rounded-lg p-2"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl">
                      {tab === 'activity'
                        ? 'Activity log'
                        : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                      {tab === 'activity'
                        ? 'Admin actions recorded in the audit log'
                        : tab === 'reports'
                          ? 'Concerns raised by your community'
                          : lastRefreshed
                            ? `Last refreshed ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Admin access`
                            : 'Live community records · Admin access'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      void loadContent();
                      if (auditRequested) void loadAuditLog();
                    }}
                    disabled={
                      loading || auditLoading || pendingUserAction !== null
                    }
                    className="ak-button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {loading || auditLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {tab !== 'reports' && (
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
                              : tab === 'activity'
                                ? 'Action, actor, or target ID'
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
                    <label className="flex items-center gap-2 text-sm text-[var(--theme-text-muted)]">
                      <span>
                        {tab === 'users'
                          ? 'Account state'
                          : tab === 'activity'
                            ? 'Category'
                            : 'Visibility'}
                      </span>
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
                          : tab === 'activity'
                            ? [
                                'All',
                                'Reassignments',
                                'Moderation',
                                'Deletions',
                              ]
                            : ['All', 'Visible', 'Hidden']
                        ).map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {pendingUserAction && (
                  <p
                    role="status"
                    className="mt-4 text-sm text-[var(--theme-accent)]"
                  >
                    Applying changes…
                  </p>
                )}
                {tab !== 'reports' &&
                  (loading || (tab === 'activity' && auditLoading)) && (
                    <p
                      role="status"
                      className="mt-4 text-sm text-[var(--theme-text-muted)]"
                    >
                      {loadedOnce
                        ? tab === 'activity' && !auditEntries.length
                          ? 'Loading activity log…'
                          : 'Refreshing collections…'
                        : 'Loading admin workspace…'}
                    </p>
                  )}
                {loadedOnce && tab !== 'reports' && !contentUnavailable && (
                  <p className="mt-4 text-xs text-[var(--theme-text-muted)]">
                    {filteredCount} of {total}{' '}
                    {tab === 'activity' ? 'entries' : tab}
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
                    <h3 className="text-xl">
                      No matching {tab === 'activity' ? 'entries' : tab}
                    </h3>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ak-button-secondary mt-4 rounded-xl px-4 py-2 text-sm"
                    >
                      Show all {tab === 'activity' ? 'entries' : tab}
                    </button>
                  </div>
                ) : (
                  <fieldset
                    disabled={
                      pendingUserAction !== null ||
                      loading ||
                      (tab === 'activity' && auditLoading)
                    }
                    className="min-w-0"
                  >
                    {tab === 'recipes' && (
                      <RecipesPanel
                        recipes={filteredRecipes.slice(start, start + pageSize)}
                        users={users}
                        editingRecipe={editingRecipe}
                        recipeForm={recipeForm}
                        setEditingRecipe={setEditingRecipe}
                        setRecipeForm={setRecipeForm}
                        saveRecipe={saveRecipe}
                        removeRecipe={removeRecipe}
                        onHideRecipe={hideRecipe}
                        onTransfer={transferOwnership}
                        pendingUserAction={pendingUserAction}
                        loading={loading || !loadedOnce}
                      />
                    )}
                    {tab === 'comments' && (
                      <CommentsPanel
                        comments={filteredComments.slice(
                          start,
                          start + pageSize
                        )}
                        editingComment={editingComment}
                        commentForm={commentForm}
                        setEditingComment={setEditingComment}
                        setCommentForm={setCommentForm}
                        saveComment={saveComment}
                        removeComment={removeComment}
                        onHideComment={hideComment}
                        loading={loading || !loadedOnce}
                      />
                    )}
                    {tab === 'users' && (
                      <UsersPanel
                        users={filteredUsers.slice(start, start + pageSize)}
                        loading={loading || !loadedOnce}
                        unavailable={userListUnavailable}
                        onModerateUser={moderateUser}
                        pendingUserAction={pendingUserAction}
                      />
                    )}
                    {tab === 'activity' && (
                      <ActivityPanel
                        entries={filteredAudit.slice(start, start + pageSize)}
                        loading={auditLoading}
                        unavailable={auditUnavailable}
                        actorById={ownerById}
                        hasMore={Boolean(auditNextToken)}
                        loadingMore={auditLoadingMore}
                        onLoadMore={() => void loadMoreAuditLog()}
                      />
                    )}
                    {tab === 'reports' && <ReportsPanel />}
                  </fieldset>
                )}
                {loadedOnce && filteredCount > 0 && (
                  <nav
                    aria-label="Collection pages"
                    className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-4 text-sm"
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
            </div>
          </div>
        </div>
      </div>
      {pendingDeleteUser && (
        <AccessibleDialog
          label="Confirm user deletion"
          onClose={closeDeleteDialog}
        >
          <section className="ak-panel mx-auto my-12 max-w-lg p-6 sm:p-8">
            <ShieldCheck
              className="mb-4 h-8 w-8 text-red-700"
              aria-hidden="true"
            />
            <p className="ak-eyebrow text-red-700">Danger zone</p>
            <h2 className="mt-2 text-2xl">
              Delete @{pendingDeleteUser.username}?
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--theme-text-muted)]">
              This disables the account and hides their content. It is
              reversible — Restore brings the account and their visibility back.
            </p>
            <p className="mt-3 text-sm leading-6">
              They own{' '}
              <strong>
                {pendingDeleteOwnedCount}{' '}
                {pendingDeleteOwnedCount === 1 ? 'recipe' : 'recipes'}
              </strong>{' '}
              in this workspace.
            </p>
            {pendingDeleteOwnedCount > 0 && (
              <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                Reassign first (recommended) so their recipes stay available to
                the community after the account is disabled.
              </p>
            )}
            <label className="mt-4 block text-sm">
              <span className="block text-[var(--theme-text-muted)]">
                Type <span className="font-mono">{pendingDeleteExpected}</span>{' '}
                to confirm
              </span>
              <input
                value={deleteEmailInput}
                onChange={(event) => setDeleteEmailInput(event.target.value)}
                aria-label="Type the account email to confirm deletion"
                autoComplete="off"
                className="ak-input mt-2 min-h-11 w-full rounded-xl px-3 py-2"
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {pendingDeleteOwnedCount > 0 && (
                <button
                  type="button"
                  onClick={reassignBeforeDelete}
                  className="ak-button-secondary mr-auto rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  Reassign first (recommended)
                </button>
              )}
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="ak-button-secondary rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteUser()}
                disabled={
                  deleteEmailInput.trim().toLowerCase() !==
                  pendingDeleteExpected
                }
                className="ak-button-danger rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                Delete account
              </button>
            </div>
          </section>
        </AccessibleDialog>
      )}
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
