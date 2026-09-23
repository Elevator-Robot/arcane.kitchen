import { Heart, MessageCircle, MoreVertical } from 'lucide-react';
import type { Recipe } from '../../types/profile';
import Button from '../ui/Button';

type Props = {
  recipe: Recipe;
  onOptions?: (id: Recipe['id']) => void;
  onClick?: (id: Recipe['id']) => void;
  isFavorited?: boolean;
  isPendingFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export default function RecipeCard({
  recipe,
  onOptions,
  onClick,
  isFavorited = false,
  isPendingFavorite = false,
  onToggleFavorite,
}: Props) {
  return (
    <div
      onClick={() => onClick?.(recipe.id)}
      className="ak-recipe-card flex cursor-pointer flex-col overflow-hidden"
    >
      <div className="relative h-48 w-full">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--theme-surface-alt)] text-sm text-[var(--theme-text-muted)]">
            No photo
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="mb-1 line-clamp-2 font-semibold text-[var(--theme-text)]">
            <Button
              variant="unstyled"
              size="none"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick?.(recipe.id);
              }}
              className="text-left hover:text-[var(--theme-accent)]"
            >
              {recipe.title}
            </Button>
          </h3>
          <p className="mb-4 text-xs text-[var(--theme-text-muted)]">
            {recipe.time}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--theme-border)] pt-3 text-xs text-[var(--theme-text-muted)]">
          <div className="flex items-center gap-4">
            {typeof recipe.comments === 'number' && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" aria-hidden="true" />{' '}
                {recipe.comments}
              </span>
            )}
            <Button
              variant="secondary"
              size="none"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite?.(String(recipe.id));
              }}
              disabled={isPendingFavorite || !onToggleFavorite}
              aria-pressed={isFavorited}
              aria-label={
                isFavorited ? `Unsave ${recipe.title}` : `Save ${recipe.title}`
              }
              className="ak-button-save gap-1.5 rounded-full px-3 py-2 text-sm disabled:opacity-60"
            >
              <Heart
                className="h-4 w-4"
                fill={isFavorited ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span>{recipe.saves ?? 0}</span>
            </Button>
          </div>

          {onOptions && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={`Edit ${recipe.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onOptions(recipe.id);
              }}
              className="rounded-full"
            >
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
