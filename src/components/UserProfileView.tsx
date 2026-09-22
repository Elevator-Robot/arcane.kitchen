import React from 'react';
import ProfileHeader from './profile/ProfileHeader';
import NavigationTabs from './profile/NavigationTabs';
import RecipeCard from './profile/RecipeCard';
import DraftCard from './profile/DraftCard';
import type { User, Recipe, Draft } from '../types/profile';
import { Link } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import {
  CustomizeSanctuary,
  SanctuaryBanner,
  SanctuaryDetails,
  SignatureRecipe,
} from './profile/KitchenSanctuary';
import {
  normalizeKitchenIdentity,
  type KitchenIdentity,
} from '../utils/kitchenIdentity';

type Props = {
  user: User;
  publishedRecipes: Recipe[];
  isLoadingRecipes?: boolean;
  draftRecipes?: Draft[];
  savedRecipes?: Recipe[];
  onSelectPreset?: (file: string) => void;
  onShareProfile?: () => void;
  onNewRecipe?: () => void;
  onContinueDraft?: (id: Draft['id']) => void;
  onDeleteDraft?: (id: Draft['id']) => void;
  onRecipeOptions?: (id: Recipe['id']) => void;
  onOpenRecipe?: (id: Recipe['id']) => void;
  favoriteRecipeIds?: Set<string>;
  pendingFavoriteRecipeIds?: Set<string>;
  onToggleFavorite?: (id: string) => void;
  isOwnProfile?: boolean;
  onSaveKitchenIdentity?: (identity: KitchenIdentity) => Promise<void>;
  onProfileUpdated?: (next: {
    name?: string;
    handle?: string;
    bio?: string;
  }) => void;
};

export default function UserProfileView({
  user,
  publishedRecipes,
  isLoadingRecipes = false,
  draftRecipes = [],
  savedRecipes = [],
  onRecipeOptions,
  onOpenRecipe,
  onContinueDraft,
  onDeleteDraft,
  favoriteRecipeIds,
  pendingFavoriteRecipeIds,
  onToggleFavorite,
  isOwnProfile = true,
  onProfileUpdated,
  onSelectPreset,
  onShareProfile,
  onNewRecipe,
  onSaveKitchenIdentity,
}: Props) {
  const [activeTab, setActiveTab] = React.useState<
    'recipes' | 'drafts' | 'saved'
  >('recipes');
  const [customizing, setCustomizing] = React.useState(false);
  const [savedNotice, setSavedNotice] = React.useState(false);
  const identity = normalizeKitchenIdentity(user.kitchenIdentity);
  const signature = publishedRecipes.find(
    (recipe) => String(recipe.id) === identity.signatureRecipeId
  );
  const visibleTab = isOwnProfile ? activeTab : 'recipes';
  const openRecipe = (id: Recipe['id']) => {
    if (onOpenRecipe) onOpenRecipe(id);
    else window.location.assign(`/recipe/${encodeURIComponent(String(id))}`);
  };

  React.useEffect(() => {
    setActiveTab('recipes');
    setCustomizing(false);
    setSavedNotice(false);
  }, [isOwnProfile, user.id]);

  return (
    <div className="mx-auto w-full max-w-6xl pb-6">
      <div className="w-full">
        <div className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm">
          <SanctuaryBanner
            identity={identity}
            onCustomize={
              isOwnProfile && onSaveKitchenIdentity
                ? () => {
                    setSavedNotice(false);
                    setCustomizing(true);
                  }
                : undefined
            }
          />
          <ProfileHeader
            key={user.id || user.handle}
            user={user}
            isOwnProfile={isOwnProfile}
            onSelectPreset={onSelectPreset}
            onShareProfile={onShareProfile}
            onProfileUpdated={onProfileUpdated}
          />
          {isOwnProfile && (
            <NavigationTabs
              active={activeTab}
              draftsCount={draftRecipes.length}
              savedCount={savedRecipes.length}
              showPrivateTabs={isOwnProfile}
              onChange={setActiveTab}
            />
          )}
        </div>
        {savedNotice && (
          <p role="status" className="mt-4 text-sm text-[var(--theme-accent)]">
            Sanctuary saved. Your kitchen has a little more you in it.
          </p>
        )}
        <div className="mt-5">
          <SanctuaryDetails identity={identity} isOwnProfile={isOwnProfile} />
        </div>
        {visibleTab === 'recipes' && signature && (
          <div className="mt-5">
            <SignatureRecipe recipe={signature} onOpen={openRecipe} />
          </div>
        )}
        <div className="mb-5 mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {visibleTab === 'recipes'
                ? 'From this kitchen'
                : 'Only visible to you'}
            </p>
            <h2 className="mt-2 text-2xl">
              {visibleTab === 'recipes'
                ? 'The recipe grimoire'
                : visibleTab === 'drafts'
                  ? 'Works in progress'
                  : 'Treasures worth keeping'}
            </h2>
            <p className="mt-2 text-xs text-[var(--theme-text-muted)]">
              {visibleTab === 'recipes' &&
              isLoadingRecipes &&
              !publishedRecipes.length
                ? 'Loading recipes…'
                : visibleTab === 'recipes'
                  ? `${publishedRecipes.length} shared ${publishedRecipes.length === 1 ? 'recipe' : 'recipes'} · ${publishedRecipes.reduce((sum, recipe) => sum + (recipe.saves || 0), 0)} community saves`
                  : visibleTab === 'drafts'
                    ? 'Unfinished ideas have a home here.'
                    : 'A collection of inspiration from other kitchens.'}
            </p>
          </div>
          {isOwnProfile && onNewRecipe && visibleTab !== 'saved' && (
            <button
              type="button"
              onClick={onNewRecipe}
              className="ak-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create recipe
            </button>
          )}
        </div>
        <div>
          {visibleTab === 'recipes' &&
            !publishedRecipes.length &&
            isLoadingRecipes && (
              <div
                role="status"
                aria-label="Loading profile recipes"
                className="grid gap-4 sm:grid-cols-2"
              >
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    aria-hidden="true"
                    className="ak-panel h-48 bg-[var(--theme-surface-alt)]"
                  />
                ))}
              </div>
            )}
          {visibleTab === 'recipes' &&
            !publishedRecipes.length &&
            !isLoadingRecipes && (
              <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center">
                <p className="font-heading text-xl">
                  {isOwnProfile
                    ? 'Your grimoire starts with a single recipe.'
                    : 'A new story is simmering.'}
                </p>
                <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
                  {isOwnProfile
                    ? 'Share a family favorite, a brave experiment, or your everyday comfort food.'
                    : 'This cook hasn’t shared a recipe yet. There’s plenty more magic to discover.'}
                </p>
                {!isOwnProfile && (
                  <Link
                    to="/discover"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--theme-accent)]"
                  >
                    Explore other kitchens →
                  </Link>
                )}
              </div>
            )}
          {visibleTab === 'recipes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedRecipes.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onClick={openRecipe}
                  onOptions={isOwnProfile ? onRecipeOptions : undefined}
                  isFavorited={favoriteRecipeIds?.has(String(r.id))}
                  isPendingFavorite={pendingFavoriteRecipeIds?.has(
                    String(r.id)
                  )}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}

          {visibleTab === 'drafts' && isOwnProfile && (
            <div className="space-y-4">
              {!draftRecipes.length && (
                <p className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm text-[var(--theme-text-muted)]">
                  No works in progress. Start a recipe and your ideas will save
                  here as you go.
                </p>
              )}
              {draftRecipes.map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  onContinue={onContinueDraft}
                  onOptions={onDeleteDraft}
                />
              ))}
            </div>
          )}

          {visibleTab === 'saved' && isOwnProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!savedRecipes.length && (
                <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center md:col-span-2">
                  <p className="text-sm text-[var(--theme-text-muted)]">
                    Your treasure shelf is waiting. Save a recipe you’d love to
                    make.
                  </p>
                  <Link
                    to="/discover"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--theme-accent)]"
                  >
                    Find your next favorite →
                  </Link>
                </div>
              )}
              {savedRecipes.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onClick={openRecipe}
                  isFavorited={favoriteRecipeIds?.has(String(r.id))}
                  isPendingFavorite={pendingFavoriteRecipeIds?.has(
                    String(r.id)
                  )}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {customizing && isOwnProfile && onSaveKitchenIdentity && (
        <CustomizeSanctuary
          user={user}
          recipes={publishedRecipes}
          onClose={() => setCustomizing(false)}
          onSave={async (next) => {
            await onSaveKitchenIdentity(next);
            setSavedNotice(true);
          }}
        />
      )}
    </div>
  );
}
