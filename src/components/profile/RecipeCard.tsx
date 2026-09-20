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
    <div onClick={() => onClick?.(recipe.id)} className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
          <h3 className="mb-1 line-clamp-2 font-semibold text-[var(--theme-text)]">{recipe.title}</h3>
          <p className="mb-4 text-xs text-[var(--theme-text-muted)]">{recipe.time}</p>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--theme-border)] pt-3 text-xs text-[var(--theme-text-muted)]">
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

          <button onClick={(e) => { e.stopPropagation(); onOptions?.(recipe.id); }} className="rounded p-1 text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)]"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
