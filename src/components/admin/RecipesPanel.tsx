import { Link } from 'react-router-dom';
import VisibilityBadge from './VisibilityBadge';
import type { AdminRecipe } from './types';

export default function RecipesPanel({
  recipes,
  editingRecipe,
  recipeForm,
  setEditingRecipe,
  setRecipeForm,
  saveRecipe,
  removeRecipe,
  loading,
}: any) {
  return (
    <div className="mt-5 space-y-3">
      {recipes.map((recipe: AdminRecipe) => (
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-xl font-semibold">
                    {recipe.name}
                  </h3>
                  <VisibilityBadge hidden={recipe.isHidden} />
                </div>
                <p className="mt-1 break-all text-xs text-[var(--theme-text-muted)]">
                  Owner: {recipe.ownerId}
                </p>
                <p className="mt-2 break-words text-sm text-[var(--theme-text-muted)]">
                  {recipe.description || 'No description'}
                </p>
                <Link
                  to={`/discover?recipe=${encodeURIComponent(recipe.id)}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                >
                  View recipe
                </Link>
              </div>
              <div className="flex shrink-0 gap-2">
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
                  onClick={() => void removeRecipe(recipe)}
                  className="ak-button-danger-soft rounded-xl px-3 py-2 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {!recipes.length && !loading && (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">
          No recipes found.
        </p>
      )}
    </div>
  );
}
