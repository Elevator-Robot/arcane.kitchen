export interface RecipeDeleteUndoItem<T> {
  item: T;
  index: number;
}

export const removeRecipeById = <T extends { id: string }>(
  recipes: T[],
  recipeId: string
): { nextRecipes: T[]; removedRecipe: T | null; removedIndex: number } => {
  const index = recipes.findIndex((recipe) => recipe.id === recipeId);

  if (index === -1) {
    return { nextRecipes: recipes, removedRecipe: null, removedIndex: -1 };
  }

  const removedRecipe = recipes[index];
  const nextRecipes = recipes.filter((recipe) => recipe.id !== recipeId);

  return { nextRecipes, removedRecipe, removedIndex: index };
};

export const restoreRecipeById = <T extends { id: string }>(
  recipes: T[],
  recipe: T | null,
  index: number
): T[] => {
  if (!recipe || index < 0) return recipes;

  if (recipes.some((existingRecipe) => existingRecipe.id === recipe.id)) {
    return recipes;
  }

  const nextRecipes = [...recipes];
  nextRecipes.splice(index, 0, recipe);

  return nextRecipes;
};
