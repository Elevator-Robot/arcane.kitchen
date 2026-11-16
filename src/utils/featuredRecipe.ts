export const FEATURED_RECIPE_SLOT = 'emporium';

type AuthMode = 'userPool' | 'identityPool';
type FeaturedSelection = { id: string; recipeId?: string | null };

function requireRead<T>(result: {
  data?: T | null;
  errors?: { message: string }[];
}): T | null {
  if (result.errors?.length)
    throw new Error(result.errors.map((error) => error.message).join(', '));
  if (result.data === undefined)
    throw new Error('Featured recipe response is unavailable.');
  return result.data;
}

export async function readFeaturedSelection(
  client: any,
  authMode: AuthMode
): Promise<FeaturedSelection | null> {
  if (!client.models.FeaturedRecipe)
    throw new Error('Featured recipe configuration is unavailable.');
  return requireRead<FeaturedSelection>(
    await client.models.FeaturedRecipe.get(
      { id: FEATURED_RECIPE_SLOT },
      { authMode }
    )
  );
}

/** The feature resolves independently of feed pagination and search filters. */
export async function readFeaturedRecipe(client: any, authenticated: boolean) {
  // Older backend outputs have no feature model yet.
  if (!client.models.FeaturedRecipe) return null;
  const authModes: AuthMode[] = authenticated
    ? ['userPool', 'identityPool']
    : ['identityPool'];
  for (const authMode of authModes) {
    try {
      const selection = await readFeaturedSelection(client, authMode);
      if (!selection?.recipeId) return null;
      const recipe = requireRead<any>(
        await client.models.Recipe.get({ id: selection.recipeId }, { authMode })
      );
      return recipe?.id && recipe?.name && !recipe.isHidden ? recipe : null;
    } catch (error) {
      if (
        authMode === authModes[authModes.length - 1] ||
        !(error instanceof Error) ||
        !/not authorized|unauthorized/i.test(error.message)
      )
        throw error;
    }
  }
  return null;
}

/** Amplify model authorization restricts these writes to the Cognito Admins group. */
export async function saveFeaturedRecipe(client: any, recipeId: string | null) {
  const selection = await readFeaturedSelection(client, 'userPool');
  if (recipeId) {
    const recipe = requireRead<any>(
      await client.models.Recipe.get({ id: recipeId }, { authMode: 'userPool' })
    );
    if (!recipe?.id || !recipe.name || recipe.isHidden)
      throw new Error('The selected recipe is no longer available.');
  }
  if (!selection && !recipeId) return;
  const method = selection ? 'update' : 'create';
  const result = requireRead<FeaturedSelection>(
    await client.models.FeaturedRecipe[method](
      { id: FEATURED_RECIPE_SLOT, recipeId },
      { authMode: 'userPool' }
    )
  );
  if (!result) throw new Error('The featured recipe could not be saved.');
}
