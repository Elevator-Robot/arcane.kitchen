import { Heart, MessageCircle, MoreVertical } from 'lucide-react';
import type { Recipe } from '../../types/profile';

type Props = {
  recipe: Recipe;
  onOptions?: (id: Recipe['id']) => void;
  onClick?: (id: Recipe['id']) => void;
  isFavorited?: boolean;
  isPendingFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export default function RecipeCard({ recipe, onOptions, onClick, isFavorited = false, isPendingFavorite = false, onToggleFavorite }: Props) {
  return (
    <div onClick={() => onClick?.(recipe.id)} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col cursor-pointer">
      <div className="relative h-48 w-full">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--theme-surface-alt)] text-sm text-[var(--theme-text-muted)]">
            No photo
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-[#1c1917] line-clamp-2 mb-1">{recipe.title}</h3>
          <p className="text-xs text-gray-500 mb-4">{recipe.time}</p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {recipe.comments ?? 0}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite?.(String(recipe.id));
              }}
              disabled={isPendingFavorite || !onToggleFavorite}
              aria-label={isFavorited ? `Unsave ${recipe.title}` : `Save ${recipe.title}`}
              className={`inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                isFavorited
                  ? 'text-fuchsia-600'
                  : 'text-[var(--theme-text-muted)] hover:text-fuchsia-600'
              }`}
            >
              <Heart className="h-4 w-4" fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
              <span>{recipe.saves ?? 0}</span>
            </button>
          </div>

          <button onClick={(e) => { e.stopPropagation(); onOptions?.(recipe.id); }} className="p-1 hover:bg-gray-50 rounded text-gray-500"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
