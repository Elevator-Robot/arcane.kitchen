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
  onSelectPreset?: (file: string) => void;
  onNewRecipe?: () => void;
  onRecipeOptions?: (id: Recipe['id']) => void;
  onOpenRecipe?: (id: Recipe['id']) => void;
  isOwnProfile?: boolean;
  onProfileUpdated?: (next: { name?: string; handle?: string; bio?: string }) => void;
};

export default function UserProfileView({
  user,
  publishedRecipes,
  draftRecipes = [],
  savedRecipes = [],
  onAvatarUpload,
  onRecipeOptions,
  onOpenRecipe,
  isOwnProfile = true,
  onProfileUpdated,
  onSelectPreset,
}: Props) {
  const [activeTab, setActiveTab] = React.useState<'recipes' | 'drafts' | 'saved'>('recipes');

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="w-full">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ProfileHeader user={user} isOwnProfile={isOwnProfile} onAvatarUpload={onAvatarUpload} onSelectPreset={onSelectPreset} onProfileUpdated={onProfileUpdated} />
          <NavigationTabs active={activeTab} draftsCount={draftRecipes.length} savedCount={savedRecipes.length} onChange={setActiveTab} />
        </div>
        <div className="mt-6">
          {activeTab === 'recipes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} onClick={(id) => {
                  if (onOpenRecipe) {
                    onOpenRecipe(id);
                  } else {
                    window.location.assign(`/recipe/${id}`);
                  }
                }} onOptions={onRecipeOptions} />
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

          {activeTab === 'saved' && isOwnProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} onClick={(id) => {
                  if (onOpenRecipe) {
                    onOpenRecipe(id);
                  } else {
                    window.location.assign(`/recipe/${id}`);
                  }
                }} onOptions={onRecipeOptions} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
