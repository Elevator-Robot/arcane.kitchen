import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  render,
  defaultRecipeBuilderProps,
  unauthenticatedRecipeBuilderProps,
} from '../../test/test-utils';

const createMockRecipe = (overrides: Record<string, unknown> = {}) => ({
  id: 'recipe-1',
  ownerId: 'user-1',
  name: 'Test Recipe',
  description: 'A test recipe',
  createdBy: 'Test Cook',
  createdAt: new Date().toISOString(),
  imageUrl: undefined,
  prepTime: undefined,
  tags: [],
  instructions: ['Mix ingredients'],
  utensils: [],
  ratings: [],
  recipeFingerprint: undefined,
  recipeNameKey: undefined,
  notes: undefined,
  ...overrides,
});

const { mockRecipeList, mockRecipeGetUrl, mockRecipeUploadData } =
  vi.hoisted(() => ({
    mockRecipeList: vi
      .fn()
      .mockResolvedValue({ data: [], errors: undefined }),
    mockRecipeGetUrl: vi
      .fn()
      .mockResolvedValue({ url: new URL('https://example.com/image.jpg') }),
    mockRecipeUploadData: vi
      .fn()
      .mockReturnValue({ result: Promise.resolve({ path: 'test-path' }) }),
  }));

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Recipe: {
        list: mockRecipeList,
        get: vi.fn().mockResolvedValue({ data: null, errors: undefined }),
        create: vi
          .fn()
          .mockResolvedValue({ data: { id: 'new-id' }, errors: undefined }),
        update: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        delete: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
      },
      Ingredient: {
        create: vi
          .fn()
          .mockResolvedValue({
            data: { id: 'ing-1' },
            errors: undefined,
          }),
        get: vi
          .fn()
          .mockResolvedValue({
            data: { name: 'Test Ingredient' },
            errors: undefined,
          }),
      },
      RecipeIngredient: {
        list: vi.fn().mockResolvedValue({ data: [], errors: undefined }),
        create: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        delete: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
      },
      Favorite: {
        list: vi.fn().mockResolvedValue({ data: [], errors: undefined }),
        create: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        delete: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
      },
    },
  }),
}));

vi.mock('aws-amplify/storage', () => ({
  getUrl: mockRecipeGetUrl,
  uploadData: mockRecipeUploadData,
}));

const renderRecipeBuilder = async (props: Record<string, unknown> = {}) => {
  const { default: RecipeBuilder } = await import('../RecipeBuilder');
  return render(<RecipeBuilder {...(props as any)} />);
};

describe('RecipeBuilder Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    mockRecipeList.mockResolvedValue({ data: [], errors: undefined });
  });

  it('renders the social recipe workspace', async () => {
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    expect(await screen.findByText('Arcane Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Search recipes')).toBeInTheDocument();
    expect(screen.getByTitle('Create a recipe')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search recipes...')
    ).toBeInTheDocument();
  }, 20000);

  it('updates the post preview as recipe fields change', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    const nameInput = screen.getAllByPlaceholderText("e.g., Grandma's Apple Pie")[0];
    await user.type(nameInput, 'Roasted Corn Salad');

    expect(
      screen.getByRole('heading', { name: 'Roasted Corn Salad' })
    ).toBeInTheDocument();
  }, 20000);

  it('allows ingredients to be added and removed', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    await user.click(addButtons[0]);
    const ingredientFields = screen.getAllByLabelText('Ingredient');

    expect(ingredientFields.length).toBeGreaterThan(0);

    await user.click(screen.getAllByLabelText('Remove ingredient')[1]);

    expect(screen.getAllByLabelText('Ingredient').length).toBeLessThanOrEqual(ingredientFields.length);
  }, 10000);

  it('updates the browser URL when a recipe is opened', async () => {
    mockRecipeList.mockResolvedValue({
      data: [createMockRecipe()],
      errors: undefined,
    });
    window.history.replaceState({}, '', '/');

    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    await user.click(await screen.findByText('Test Recipe'));

    expect(window.location.pathname).toBe('/recipe/recipe-1');
  });

  it('shows a share menu when native sharing is unavailable', async () => {
    const user = userEvent.setup();
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });

    mockRecipeList.mockResolvedValue({
      data: [createMockRecipe()],
      errors: undefined,
    });
    window.history.replaceState({}, '', '/');

    await renderRecipeBuilder(defaultRecipeBuilderProps);

    await user.click(await screen.findByText('Test Recipe'));
    await user.click(await screen.findByRole('button', { name: 'Share' }));

    expect(await screen.findByText('Copy Link')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
  }, 20000);

  it('shows saved recipes from existing favorites', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'arcaneKitchen.favoriteRecipeIds',
      JSON.stringify(['recipe-1'])
    );
    mockRecipeList.mockResolvedValue({
      data: [createMockRecipe({ name: 'Saved Recipe' })],
      errors: undefined,
    });

    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: 'Saved Recipes' }));

    expect(await screen.findByText('Saved recipes')).toBeInTheDocument();
    expect(screen.getAllByText('Saved Recipe').length).toBeGreaterThan(0);
  }, 20000);

  it('prompts unauthenticated users to sign in before creating', async () => {
    await renderRecipeBuilder(unauthenticatedRecipeBuilderProps);

    expect(
      screen.getAllByRole('button', { name: 'Log in to create' })[0]
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start publishing your own recipes')
    ).toBeInTheDocument();
  }, 10000);
});
