import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  Ellipsis,
  Eye,
  EyeOff,
  Sparkles,
  X,
} from 'lucide-react';
import VisibilityBadge from './VisibilityBadge';
import {
  matchesAdminSearch,
  userModerationStatus,
} from '../../utils/adminConsole';
import { MERLIN_PALETTE } from '../../theme/merlinPalette';
import type { AdminRecipe, AdminUserProfile } from './types';

const monogramColor = (key: string) => {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return MERLIN_PALETTE[hash % MERLIN_PALETTE.length];
};

export default function RecipesPanel({
  recipes,
  users,
  editingRecipe,
  recipeForm,
  setEditingRecipe,
  setRecipeForm,
  saveRecipe,
  removeRecipe,
  onHideRecipe,
  onTransfer,
  pendingUserAction,
  loading,
  recipeHref,
  featuredRecipeId,
  featureLoaded,
  onFeature,
}: {
  recipes: AdminRecipe[];
  users: AdminUserProfile[];
  editingRecipe: AdminRecipe | null;
  recipeForm: { name: string; description: string };
  setEditingRecipe: (recipe: AdminRecipe | null) => void;
  setRecipeForm: (form: { name: string; description: string }) => void;
  saveRecipe: () => Promise<void>;
  removeRecipe: (recipe: AdminRecipe) => Promise<void>;
  onHideRecipe: (recipe: AdminRecipe) => Promise<void>;
  onTransfer: (
    recipe: AdminRecipe,
    destination: AdminUserProfile
  ) => Promise<boolean>;
  pendingUserAction: string | null;
  loading: boolean;
  recipeHref: (recipeId: string) => string;
  featuredRecipeId: string | null;
  featureLoaded: boolean;
  onFeature: (recipeId: string) => void;
}) {
  const [transferFor, setTransferFor] = useState<string | null>(null);
  const [transferQuery, setTransferQuery] = useState('');
  const [transferDestination, setTransferDestination] =
    useState<AdminUserProfile | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const ownerById = useMemo(
    () => new Map(users.map((user) => [user.userId, user])),
    [users]
  );
  const displayNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      counts.set(user.displayName, (counts.get(user.displayName) ?? 0) + 1);
    }
    return counts;
  }, [users]);

  const transferCandidates = useMemo(() => {
    const recipe = recipes.find((entry) => entry.id === transferFor);
    return users.filter((user) => {
      if (user.userId === recipe?.ownerId) return false;
      const moderation = userModerationStatus(user);
      if (moderation === 'Banned' || moderation === 'Deleted') return false;
      return matchesAdminSearch(
        transferQuery,
        user.displayName,
        user.username,
        user.email,
        user.userId
      );
    });
  }, [users, transferQuery, transferFor, recipes]);

  const busy = pendingUserAction !== null;

  const openTransfer = (recipe: AdminRecipe) => {
    setMenuFor(null);
    setTransferFor(recipe.id);
    setTransferQuery('');
    setTransferDestination(null);
  };

  const closeTransfer = () => {
    setTransferFor(null);
    setTransferQuery('');
    setTransferDestination(null);
  };

  const confirmTransfer = async (recipe: AdminRecipe) => {
    if (!transferDestination) return;
    const succeeded = await onTransfer(recipe, transferDestination);
    if (succeeded) closeTransfer();
  };

  const closeMenu = () => {
    setMenuFor(null);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!menuFor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-recipe-more-menu]')) setMenuFor(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuFor]);

  return (
    <div className="mt-5 space-y-3">
      {recipes.map((recipe) => {
        const owner = ownerById.get(recipe.ownerId);
        const ownerName =
          owner?.displayName ||
          owner?.username ||
          recipe.createdBy ||
          'Unknown owner';
        return (
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
                <p className="break-all font-mono text-xs text-[var(--theme-text-muted)]">
                  ID: {recipe.id}
                </p>
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    title={recipe.id}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-heading text-xl font-semibold text-white"
                    style={{ backgroundColor: monogramColor(recipe.id) }}
                  >
                    {recipe.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-xl font-semibold">
                        {recipe.name}
                      </h3>
                      <VisibilityBadge hidden={recipe.isHidden} />
                    </div>
                    <p className="mt-2 break-words text-sm text-[var(--theme-text-muted)]">
                      {recipe.description || 'No description'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTransfer(recipe)}
                        disabled={busy}
                        aria-label={`Transfer ${recipe.name} from ${ownerName}`}
                        className="ak-button-secondary inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-semibold text-white"
                          style={{
                            backgroundColor: monogramColor(recipe.ownerId),
                          }}
                        >
                          {ownerName.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold">{ownerName}</span>
                        <ArrowRightLeft
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </button>
                      <Link
                        to={recipeHref(recipe.id)}
                        className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                      >
                        View recipe
                      </Link>
                      <button
                        type="button"
                        onClick={() => onFeature(recipe.id)}
                        disabled={
                          !featureLoaded ||
                          loading ||
                          busy ||
                          Boolean(recipe.isHidden) ||
                          featuredRecipeId === recipe.id
                        }
                        aria-label={`Feature ${recipe.name}`}
                        aria-pressed={featuredRecipeId === recipe.id}
                        className="ak-button-secondary inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        {featuredRecipeId === recipe.id
                          ? 'Featured'
                          : 'Feature'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
                    Edit
                  </button>
                  <button
                    onClick={() => void onHideRecipe(recipe)}
                    disabled={busy}
                    aria-label={
                      recipe.isHidden
                        ? `Unhide ${recipe.name}`
                        : `Hide ${recipe.name}`
                    }
                    className="ak-button-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {recipe.isHidden ? (
                      <>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Show
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                        Hide
                      </>
                    )}
                  </button>
                  <div className="relative" data-recipe-more-menu>
                    <button
                      ref={menuFor === recipe.id ? menuButtonRef : null}
                      type="button"
                      aria-label={`More actions for ${recipe.name}`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor === recipe.id}
                      onClick={() =>
                        setMenuFor(menuFor === recipe.id ? null : recipe.id)
                      }
                      className="ak-button-secondary rounded-xl p-2"
                    >
                      <Ellipsis className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {menuFor === recipe.id && (
                      <div
                        role="menu"
                        className="absolute right-0 z-20 mt-1 min-w-40 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuFor(null);
                            void removeRecipe(recipe);
                          }}
                          className="ak-button-danger-soft w-full rounded-lg px-3 py-2 text-left text-sm"
                        >
                          Delete recipe…
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {transferFor === recipe.id && (
              <div className="mt-4 rounded-xl border border-[var(--theme-border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold">
                    Reassign “{recipe.name}”
                  </h4>
                  <button
                    type="button"
                    aria-label="Close transfer panel"
                    onClick={closeTransfer}
                    className="ak-button-ghost rounded-lg p-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <label className="ak-input mt-3 flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-3">
                  <span className="sr-only">Search cooks</span>
                  <input
                    value={transferQuery}
                    onChange={(event) => {
                      setTransferQuery(event.target.value);
                      setTransferDestination(null);
                    }}
                    placeholder="Search name, handle, or email"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
                  />
                </label>
                <ul className="mt-3 max-h-56 space-y-1 overflow-auto">
                  {transferCandidates.map((user) => (
                    <li key={user.userId}>
                      <button
                        type="button"
                        aria-pressed={
                          transferDestination?.userId === user.userId
                        }
                        onClick={() => setTransferDestination(user)}
                        className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                          transferDestination?.userId === user.userId
                            ? 'bg-[var(--theme-surface-alt)] font-semibold'
                            : 'hover:bg-[var(--theme-surface-alt)]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{
                            backgroundColor: monogramColor(user.userId),
                          }}
                        >
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {user.displayName}
                            {(displayNameCounts.get(user.displayName) ?? 0) >
                              1 && (
                              <span className="ml-1 font-normal text-[var(--theme-text-muted)]">
                                (@{user.username})
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-[var(--theme-text-muted)]">
                            {user.email || `@${user.username}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!transferCandidates.length && (
                    <li className="px-3 py-4 text-center text-sm text-[var(--theme-text-muted)]">
                      {transferQuery
                        ? 'No cooks match that search.'
                        : 'No other eligible accounts.'}
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeTransfer}
                    className="ak-button-secondary rounded-xl px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!transferDestination || busy}
                    onClick={() => void confirmTransfer(recipe)}
                    className="ak-button-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {pendingUserAction === 'transferOwnership'
                      ? 'Reassigning...'
                      : transferDestination
                        ? `Reassign to ${transferDestination.displayName}`
                        : 'Reassign'}
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      {!recipes.length && !loading && (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">
          No recipes found.
        </p>
      )}
    </div>
  );
}
