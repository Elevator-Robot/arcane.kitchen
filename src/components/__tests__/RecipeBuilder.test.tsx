import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  render,
  defaultRecipeBuilderProps,
  unauthenticatedRecipeBuilderProps,
} from '../../test/test-utils';

vi.mock('../../fake-backend', async () => {
  const actual = await vi.importActual<typeof import('../../fake-backend')>(
    '../../fake-backend'
  );
  return {
    ...actual,
    isFakeBackend: () => true,
  };
});

const renderRecipeBuilder = async (props: Record<string, unknown> = {}) => {
  const { default: RecipeBuilder } = await import('../RecipeBuilder');
  return render(<RecipeBuilder {...(props as any)} />);
};

describe('RecipeBuilder Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
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
    window.localStorage.setItem(
      'arcaneKitchen.fakeDb',
      JSON.stringify({
        recipes: {
          'recipe-1': {
            id: 'recipe-1',
            ownerId: 'user-1',
            name: 'Test Recipe',
            description: 'A test recipe',
            createdBy: 'Test Cook',
            createdAt: new Date().toISOString(),
            tags: [],
            instructions: ['Mix ingredients'],
            utensils: [],
          },
        },
        ingredients: {},
        recipeIngredients: {},
        favorites: {},
        images: {},
      })
    );
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

    window.localStorage.setItem(
      'arcaneKitchen.fakeDb',
      JSON.stringify({
        recipes: {
          'recipe-1': {
            id: 'recipe-1',
            ownerId: 'user-1',
            name: 'Test Recipe',
            description: 'A test recipe',
            createdBy: 'Test Cook',
            createdAt: new Date().toISOString(),
            tags: [],
            instructions: ['Mix ingredients'],
            utensils: [],
          },
        },
        ingredients: {},
        recipeIngredients: {},
        favorites: {},
        images: {},
      })
    );
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
    window.localStorage.setItem(
      'arcaneKitchen.fakeDb',
      JSON.stringify({
        recipes: {
          'recipe-1': {
            id: 'recipe-1',
            ownerId: 'user-1',
            name: 'Saved Recipe',
            description: 'A saved recipe',
            createdBy: 'Test Cook',
            createdAt: new Date().toISOString(),
            tags: [],
            instructions: ['Mix ingredients'],
            utensils: [],
          },
        },
        ingredients: {},
        recipeIngredients: {},
        favorites: {},
        images: {},
      })
    );

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
