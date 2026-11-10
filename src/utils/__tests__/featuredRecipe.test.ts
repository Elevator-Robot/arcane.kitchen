import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFeaturedRecipe, saveFeaturedRecipe } from '../featuredRecipe';

const selected = { id: 'emporium', recipeId: 'recipe-1' };
const recipe = { id: 'recipe-1', name: 'Hearth bread', isHidden: false };
const model = { get: vi.fn(), create: vi.fn(), update: vi.fn() };
const recipeGet = vi.fn();
const client = {
  models: { FeaturedRecipe: model, Recipe: { get: recipeGet } },
};

describe('admin-selected recipe feature', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    model.get.mockResolvedValue({ data: selected });
    recipeGet.mockResolvedValue({ data: recipe });
    model.create.mockImplementation(async (data) => ({ data }));
    model.update.mockImplementation(async (data) => ({ data }));
  });

  it('resolves the selected recipe directly with guest authorization', async () => {
    expect(await readFeaturedRecipe(client, false)).toEqual(recipe);
    expect(model.get).toHaveBeenCalledWith(
      { id: 'emporium' },
      { authMode: 'identityPool' }
    );
    expect(recipeGet).toHaveBeenCalledWith(
      { id: 'recipe-1' },
      { authMode: 'identityPool' }
    );
  });

  it.each([null, { ...recipe, isHidden: true }])(
    'omits unavailable or hidden recipes',
    async (data) => {
      recipeGet.mockResolvedValue({ data });
      expect(await readFeaturedRecipe(client, true)).toBeNull();
    }
  );

  it('leaves the slot empty after an admin clears it', async () => {
    await saveFeaturedRecipe(client, null);
    expect(model.update).toHaveBeenCalledWith(
      { id: 'emporium', recipeId: null },
      { authMode: 'userPool' }
    );
    model.get.mockResolvedValue({ data: { id: 'emporium', recipeId: null } });
    expect(await readFeaturedRecipe(client, false)).toBeNull();
    expect(recipeGet).not.toHaveBeenCalled();
  });

  it('creates the singleton on the first admin selection', async () => {
    model.get.mockResolvedValue({ data: null });
    await saveFeaturedRecipe(client, 'recipe-1');
    expect(model.create).toHaveBeenCalledWith(selected, {
      authMode: 'userPool',
    });
    expect(model.update).not.toHaveBeenCalled();
  });

  it('rejects a recipe hidden after the admin list was loaded', async () => {
    recipeGet.mockResolvedValue({ data: { ...recipe, isHidden: true } });
    await expect(saveFeaturedRecipe(client, 'recipe-1')).rejects.toThrow(
      'no longer available'
    );
    expect(model.update).not.toHaveBeenCalled();
  });

  it('propagates backend permission errors instead of reporting a successful feature', async () => {
    model.update.mockResolvedValue({
      data: selected,
      errors: [{ message: 'Not authorized' }],
    });
    await expect(saveFeaturedRecipe(client, 'recipe-1')).rejects.toThrow(
      'Not authorized'
    );
  });

  it('falls back to guest reads when the member session expires', async () => {
    model.get.mockResolvedValueOnce({
      data: null,
      errors: [{ message: 'Not authorized' }],
    });
    expect(await readFeaturedRecipe(client, true)).toEqual(recipe);
    expect(model.get).toHaveBeenLastCalledWith(
      { id: 'emporium' },
      { authMode: 'identityPool' }
    );
  });
});
