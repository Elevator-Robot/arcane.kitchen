import React from 'react';
import ProfileHeader from './profile/ProfileHeader';
import NavigationTabs from './profile/NavigationTabs';
import RecipeCard from './profile/RecipeCard';
import ShareProfileButton from './profile/ShareProfileButton';
import type { User, Recipe, Draft } from '../types/profile';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from './ui/Button';
import {
  CustomizeSanctuary,
  SanctuaryBanner,
  SanctuaryDetails,
  SignatureRecipe,
  type ProfileEditSection,
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
  savedRecipes = [],
  onRecipeOptions,
  onOpenRecipe,
  favoriteRecipeIds,
  pendingFavoriteRecipeIds,
  onToggleFavorite,
  isOwnProfile = true,
  onProfileUpdated,
  onSelectPreset,
  onNewRecipe,
  onSaveKitchenIdentity,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab =
    new URLSearchParams(location.search).get('collection') === 'saved'
      ? 'saved'
      : 'recipes';
  const setActiveTab = (tab: 'recipes' | 'saved') => {
    const params = new URLSearchParams(location.search);
    if (tab === 'saved') params.set('collection', 'saved');
    else params.delete('collection');
    navigate({ pathname: location.pathname, search: params.toString() });
  };
  const [customizing, setCustomizing] =
    React.useState<ProfileEditSection | null>(null);
  const [savedNotice, setSavedNotice] = React.useState(false);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
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
    setCustomizing(null);
    setShowAvatarModal(false);
    setSavedNotice(false);
  }, [isOwnProfile, user.id]);

  return (
    <div className="mx-auto w-full max-w-6xl pb-6">
      <div className="w-full">
        <div className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm">
          <SanctuaryBanner
            identity={identity}
            username={user.handle}
            avatarUrl={user.avatarUrl}
            onChangePortrait={
              isOwnProfile ? () => setShowAvatarModal(true) : undefined
            }
            actions={<ShareProfileButton username={user.handle} />}
            onCustomize={
              isOwnProfile && onSaveKitchenIdentity
                ? () => {
                    setSavedNotice(false);
                    setCustomizing('calling');
                  }
                : undefined
            }
          />
          <ProfileHeader
            key={user.id || user.handle}
            user={user}
            isOwnProfile={isOwnProfile}
            onSelectPreset={onSelectPreset}
            showAvatarModal={showAvatarModal}
            onCloseAvatar={() => setShowAvatarModal(false)}
            onEditBirthsign={
              isOwnProfile && onSaveKitchenIdentity
                ? () => setCustomizing('theme')
                : undefined
            }
            onProfileUpdated={onProfileUpdated}
          />
        </div>
        {savedNotice && (
          <p role="status" className="mt-4 text-sm text-[var(--theme-accent)]">
            Profile changes saved.
          </p>
        )}
        <div className="mt-5">
          <SanctuaryDetails
            key={user.id || user.handle}
            identity={identity}
            isOwnProfile={isOwnProfile}
            onSave={onSaveKitchenIdentity}
          />
        </div>
        {isOwnProfile && (
          <NavigationTabs
            active={activeTab}
            recipesCount={publishedRecipes.length}
            savedCount={savedRecipes.length}
            onChange={setActiveTab}
          />
        )}
        {visibleTab === 'recipes' && signature && (
          <div className="mt-5">
            <SignatureRecipe recipe={signature} onOpen={openRecipe} />
          </div>
        )}
        <div className="mb-5 mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl">
              {visibleTab === 'recipes' ? 'Recipes' : 'Saved recipes'}
            </h2>
            <p className="mt-2 text-xs text-[var(--theme-text-muted)]">
              {visibleTab === 'recipes' &&
              isLoadingRecipes &&
              !publishedRecipes.length
                ? 'Loading recipes…'
                : visibleTab === 'recipes'
                  ? `${publishedRecipes.length} shared ${publishedRecipes.length === 1 ? 'recipe' : 'recipes'} · ${publishedRecipes.reduce((sum, recipe) => sum + (recipe.saves || 0), 0)} community saves`
                  : `${savedRecipes.length} saved ${savedRecipes.length === 1 ? 'recipe' : 'recipes'}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwnProfile &&
              onSaveKitchenIdentity &&
              visibleTab === 'recipes' && (
                <Button
                  variant="secondary"
                  onClick={() => setCustomizing('signatureRecipeId')}
                >
                  {signature ? 'Change pinned recipe' : 'Pin recipe'}
                </Button>
              )}
            {isOwnProfile && onNewRecipe && visibleTab !== 'saved' && (
              <Button type="button" onClick={onNewRecipe}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create recipe
              </Button>
            )}
          </div>
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
                    : 'This cook hasn’t shared a recipe yet. Explore the collected recipes in the Emporium.'}
                </p>
                {!isOwnProfile && (
                  <Link
                    to="/discover"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--theme-accent)]"
                  >
                    Browse the Emporium →
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
                    Browse the Emporium →
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
          key={customizing}
          section={customizing}
          user={user}
          recipes={publishedRecipes}
          onClose={() => setCustomizing(null)}
          onSave={async (next) => {
            await onSaveKitchenIdentity(next);
            setSavedNotice(true);
          }}
        />
      )}
    </div>
  );
}
