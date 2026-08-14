import React from 'react';
import ProfileHeader from './profile/ProfileHeader';
import NavigationTabs from './profile/NavigationTabs';
import RecipeCard from './profile/RecipeCard';
import DraftCard from './profile/DraftCard';
import type { User, Recipe, Draft } from '../types/profile';

type Props = {
  user: User;
  publishedRecipes: Recipe[];
  draftRecipes?: Draft[];
  savedRecipes?: Recipe[];
  onAvatarUpload?: (file?: File) => void;
  onNewRecipe?: () => void;
  onToggleFavoriteRecipe?: (id: Recipe['id']) => void;
  onRecipeOptions?: (id: Recipe['id']) => void;
  isOwnProfile?: boolean;
  onProfileUpdated?: (next: { name?: string; handle?: string }) => void;
};

export default function UserProfileView({
  user,
  publishedRecipes,
  draftRecipes = [],
  savedRecipes = [],
  onAvatarUpload,
  onNewRecipe,
  onToggleFavoriteRecipe,
  onRecipeOptions,
  isOwnProfile = true,
  onProfileUpdated,
}: Props) {
  const [activeTab, setActiveTab] = React.useState<'recipes' | 'drafts' | 'liked'>('recipes');

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="w-full">
        <ProfileHeader user={user} isOwnProfile={isOwnProfile} onAvatarUpload={onAvatarUpload} onProfileUpdated={onProfileUpdated} />
        <NavigationTabs active={activeTab} onChange={setActiveTab} isOwnProfile={isOwnProfile} />
        <div className="mt-6">
          {activeTab === 'recipes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} onClick={(id) => window.location.assign(`/recipe/${id}`)} onToggleFavorite={onToggleFavoriteRecipe} onOptions={onRecipeOptions} />
              ))}
            </div>
          )}

          {activeTab === 'drafts' && isOwnProfile && (
            <div className="space-y-4">
              {draftRecipes.map((d) => (
                <DraftCard key={d.id} draft={d} onContinue={() => {}} onOptions={() => {}} />
              ))}
            </div>
          )}

          {activeTab === 'liked' && isOwnProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} onClick={(id) => window.location.assign(`/recipe/${id}`)} onToggleFavorite={onToggleFavoriteRecipe} onOptions={onRecipeOptions} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
