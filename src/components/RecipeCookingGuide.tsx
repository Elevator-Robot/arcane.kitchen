import { useEffect, useMemo, useState } from 'react';

type Progress = {
  signature: string;
  ingredients: number[];
  steps: number[];
};

export default function RecipeCookingGuide({
  recipeId,
  ingredients,
  instructions,
  ingredientStatus,
}: {
  recipeId: string;
  ingredients: string[];
  instructions: string[];
  ingredientStatus?: string;
}) {
  const signature = JSON.stringify([recipeId, ingredients, instructions]);
  const key = `arcaneKitchen.cooking.${recipeId}`;
  const empty: Progress = useMemo(
    () => ({ signature, ingredients: [], steps: [] }),
    [signature]
  );
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (
        saved?.signature === signature &&
        Array.isArray(saved.ingredients) &&
        Array.isArray(saved.steps)
      ) {
        return {
          signature,
          ingredients: [
            ...new Set<number>(
              saved.ingredients.filter(
                (i: number) =>
                  Number.isInteger(i) && i >= 0 && i < ingredients.length
              )
            ),
          ],
          steps: [
            ...new Set<number>(
              saved.steps.filter(
                (i: number) =>
                  Number.isInteger(i) && i >= 0 && i < instructions.length
              )
            ),
          ],
        };
      }
    } catch {
      /* A private browser may disable session storage. */
    }
    return empty;
  });
  const current = progress.signature === signature ? progress : empty;

  useEffect(() => {
    // Wait for ingredients before replacing any existing cooking session.
    if (ingredientStatus) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(current));
    } catch {
      /* Progress still works in memory. */
    }
  }, [key, current, ingredientStatus]);

  const toggle = (field: 'ingredients' | 'steps', index: number) => {
    setProgress({
      ...current,
      [field]: current[field].includes(index)
        ? current[field].filter((i) => i !== index)
        : [...current[field], index],
    });
  };
  const finished =
    instructions.length > 0 && current.steps.length === instructions.length;

  return (
    <div className="ak-cooking-guide">
      <div className="ak-cooking-columns">
        <section
          className="ak-ingredient-sheet"
          aria-labelledby={`ingredients-${recipeId}`}
        >
          <p className="ak-eyebrow">Gather your ingredients</p>
          <h4 id={`ingredients-${recipeId}`}>
            Ingredients <span>{ingredients.length || ''}</span>
          </h4>
          {ingredientStatus ? (
            <p role="status" className="mt-4 text-sm">
              {ingredientStatus}
            </p>
          ) : !ingredients.length ? (
            <p className="mt-4 text-sm">Ingredients have not been added yet.</p>
          ) : (
            <ul className="ak-ingredient-checklist">
              {ingredients.map((ingredient, index) => (
                <li key={`${index}-${ingredient}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={current.ingredients.includes(index)}
                      onChange={() => toggle('ingredients', index)}
                    />
                    <span>{ingredient}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {ingredients.length > 0 && (
            <p className="ak-checklist-note">Tap to check off what you have.</p>
          )}
        </section>
        <section
          className="ak-method-sheet"
          aria-labelledby={`method-${recipeId}`}
        >
          <p className="ak-eyebrow">Bring it all together</p>
          <h4 id={`method-${recipeId}`}>Instructions</h4>
          <div className="ak-cooking-progress">
            <p role="status">
              {current.steps.length} of {instructions.length} steps complete
              {finished ? ' · Enjoy your creation.' : ''}
            </p>
            <progress
              value={current.steps.length}
              max={Math.max(instructions.length, 1)}
              aria-label="Cooking progress"
              aria-valuetext={`${current.steps.length} of ${instructions.length} steps complete`}
            />
          </div>
          <ol className="ak-method-steps">
            {instructions.map((instruction, index) => (
              <li
                key={`${index}-${instruction}`}
                className={current.steps.includes(index) ? 'is-complete' : ''}
              >
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Step ${index + 1}: ${instruction}`}
                    checked={current.steps.includes(index)}
                    onChange={() => toggle('steps', index)}
                  />
                  <span className="ak-step-text">
                    <span className="ak-step-number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                    {instruction}
                  </span>
                </label>
              </li>
            ))}
          </ol>
          {!instructions.length && (
            <p className="mt-4 text-sm">
              Instructions have not been added yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
