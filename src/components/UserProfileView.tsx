import React from 'react';
import ProfileHeader from './profile/ProfileHeader';
import NavigationTabs, { type TabKey } from './profile/NavigationTabs';
import RecipeCard from './profile/RecipeCard';
import ShareProfileButton from './profile/ShareProfileButton';
import type { User, Recipe } from '../types/profile';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import { getUserFacingErrorMessage } from '../utils/userFacingErrors';
import Button from './ui/Button';
import {
  CustomizeSanctuary,
  SanctuaryBanner,
  SanctuaryDetails,
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
  savedRecipes?: Recipe[];
  onSelectPreset?: (file: string) => void;
  onNewRecipe?: () => void;
  onRecipeOptions?: (id: Recipe['id']) => void;
  onOpenRecipe?: (id: Recipe['id']) => void;
  favoriteRecipeIds?: Set<string>;
  pendingFavoriteRecipeIds?: Set<string>;
  onToggleFavorite?: (id: string) => void;
  isOwnProfile?: boolean;
  isAdmin?: boolean;
  onSignOut?: () => void | Promise<void>;
  onAdminContentChanged?: () => void;
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
  isAdmin = false,
  onSignOut,
  onAdminContentChanged,
  onProfileUpdated,
  onSelectPreset,
  onNewRecipe,
  onSaveKitchenIdentity,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const canUseBackrooms = isOwnProfile && isAdmin;
  const params = new URLSearchParams(location.search);
  const backroomsActive =
    canUseBackrooms && params.get('workspace') === 'backrooms';
  const activeTab: TabKey = backroomsActive
    ? 'backrooms'
    : params.get('collection') === 'saved'
      ? 'saved'
      : 'recipes';
  const setActiveTab = (tab: TabKey) => {
    const params = new URLSearchParams(location.search);
    if (tab === 'backrooms' && canUseBackrooms)
      params.set('workspace', 'backrooms');
    else {
      params.delete('workspace');
      if (tab === 'saved') params.set('collection', 'saved');
      else params.delete('collection');
    }
    navigate({
      pathname: location.pathname,
      search: params.toString(),
      hash: location.hash,
    });
  };
  const [customizing, setCustomizing] =
    React.useState<ProfileEditSection | null>(null);
  const [savedNotice, setSavedNotice] = React.useState(false);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState('');
  const signOutPending = React.useRef(false);
  const identity = normalizeKitchenIdentity(user.kitchenIdentity);
  const signature = publishedRecipes.find(
    (recipe) => String(recipe.id) === identity.signatureRecipeId
  );
  const orderedRecipes = signature
    ? [
        signature,
        ...publishedRecipes.filter((recipe) => recipe.id !== signature.id),
      ]
    : publishedRecipes;
  const visibleTab = isOwnProfile ? activeTab : 'recipes';
  const openRecipe = (id: Recipe['id']) => {
    if (onOpenRecipe) onOpenRecipe(id);
    else window.location.assign(`/recipe/${encodeURIComponent(String(id))}`);
  };
  const signOut = async () => {
    if (!onSignOut || signOutPending.current) return;
    signOutPending.current = true;
    setSigningOut(true);
    setSignOutError('');
    try {
      await onSignOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      setSignOutError(
        getUserFacingErrorMessage(
          error,
          'You could not be signed out. Please try again.'
        )
      );
    } finally {
      signOutPending.current = false;
      setSigningOut(false);
    }
  };

  React.useEffect(() => {
    setCustomizing(null);
    setShowAvatarModal(false);
    setSavedNotice(false);
    setSignOutError('');
  }, [isOwnProfile, user.id]);

  return (
    <div
      className={`ak-profile-page w-full pb-6 ${backroomsActive ? 'is-backrooms' : ''}`}
    >
      <div className="w-full">
        <div className="ak-profile-identity overflow-hidden bg-[var(--theme-surface)]">
          <SanctuaryBanner
            identity={identity}
            username={user.handle}
            avatarUrl={user.avatarUrl}
            onChangePortrait={
              isOwnProfile
                ? () => {
                    setShowAvatarModal(true);
                  }
                : undefined
            }
            actions={
              <>
                {isOwnProfile && !backroomsActive && onNewRecipe && (
                  <Button
                    variant="banner"
                    onClick={onNewRecipe}
                    aria-label="Create recipe"
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span className="hidden sm:inline">Create recipe</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                )}
                <ShareProfileButton username={user.handle} />
              </>
            }
            onCustomize={
              isOwnProfile && onSaveKitchenIdentity
                ? () => {
                    setSavedNotice(false);
                    setCustomizing('calling');
                  }
                : undefined
            }
          />
        </div>
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
        >
          <SanctuaryDetails
            key={user.id || user.handle}
            identity={identity}
            isOwnProfile={isOwnProfile}
            onSave={onSaveKitchenIdentity}
          />
        </ProfileHeader>
        {savedNotice && (
          <p role="status" className="mt-4 text-sm text-[var(--theme-accent)]">
            Profile changes saved.
          </p>
        )}
        {isOwnProfile && (
          <NavigationTabs
            active={activeTab}
            recipesCount={publishedRecipes.length}
            savedCount={savedRecipes.length}
            showBackrooms={canUseBackrooms}
            onChange={setActiveTab}
          />
        )}
        {backroomsActive ? (
          <AdminDashboard
            isAuthenticated={isOwnProfile}
            isAdmin={isAdmin}
            embedded
            profileTheme={identity.theme}
            onBack={() => setActiveTab('recipes')}
            onContentChanged={onAdminContentChanged}
            profilePinAction={
              onSaveKitchenIdentity ? (
                <Button
                  variant="secondary"
                  onClick={() => setCustomizing('signatureRecipeId')}
                >
                  {signature ? 'Change pinned recipe' : 'Pin recipe'}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="ak-profile-layout">
            <div className="min-w-0">
              <div className="ak-profile-collection-heading mb-5 mt-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="ak-eyebrow mb-2 text-[var(--theme-text-muted)]">
                    {visibleTab === 'recipes'
                      ? 'Pages from the grimoire'
                      : 'Worth coming back to'}
                  </p>
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
                  <div className="ak-profile-recipe-grid">
                    {orderedRecipes.map((r) => (
                      <RecipeCard
                        key={r.id}
                        recipe={r}
                        isPinned={signature?.id === r.id}
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
                  <div className="ak-profile-recipe-grid">
                    {!savedRecipes.length && (
                      <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center md:col-span-2">
                        <p className="text-sm text-[var(--theme-text-muted)]">
                          Your treasure shelf is waiting. Save a recipe you’d
                          love to make.
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
          </div>
        )}
      </div>
      {isOwnProfile && onSignOut && (
        <div className="ak-profile-session-actions">
          {signOutError && (
            <p role="alert" className="text-xs text-red-700">
              {signOutError}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ak-profile-logout"
            isLoading={signingOut}
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            {!signingOut && <LogOut size={13} aria-hidden="true" />}
            {signingOut ? 'Logging out…' : 'Log out'}
          </Button>
        </div>
      )}
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
