import { describe, expect, it } from 'vitest';
import { removeRecipeById, restoreRecipeById } from '../recipeDeleteUndo';

describe('recipe delete undo helpers', () => {
  it('removes a recipe and restores it at its previous index without duplication', () => {
    const recipes = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
      { id: '3', name: 'Gamma' },
    ];

    const { nextRecipes, removedRecipe, removedIndex } = removeRecipeById(
      recipes,
      '2'
    );

    expect(removedRecipe).toEqual({ id: '2', name: 'Beta' });
    expect(removedIndex).toBe(1);
    expect(nextRecipes).toEqual([
      { id: '1', name: 'Alpha' },
      { id: '3', name: 'Gamma' },
    ]);

    const restored = restoreRecipeById(nextRecipes, removedRecipe!, removedIndex);

    expect(restored).toEqual([
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
      { id: '3', name: 'Gamma' },
    ]);

    const restoredAgain = restoreRecipeById(restored, removedRecipe!, removedIndex);
    expect(restoredAgain).toEqual(restored);
  });
});
