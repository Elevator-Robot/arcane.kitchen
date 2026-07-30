import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecipeBuilder from '../RecipeBuilder';

const mockRecipeList = vi.fn();
const mockRecipeDelete = vi.fn();
const mockRecipeGet = vi.fn();
const mockRecipeCreate = vi.fn();
const mockRecipeUpdate = vi.fn();
const mockFavoriteList = vi.fn();
const mockFavoriteDelete = vi.fn();
const mockFavoriteCreate = vi.fn();
const mockGetUrl = vi.fn();

vi.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({ Storage: {} }),
  },
}));

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Recipe: {
        list: mockRecipeList,
        delete: mockRecipeDelete,
        get: mockRecipeGet,
        create: mockRecipeCreate,
        update: mockRecipeUpdate,
      },
      Favorite: {
        list: mockFavoriteList,
        delete: mockFavoriteDelete,
        create: mockFavoriteCreate,
      },
      Ingredient: {
        create: vi.fn().mockResolvedValue({ data: { id: 'ingredient-1' }, errors: [] }),
      },
      RecipeIngredient: {
        create: vi.fn().mockResolvedValue({ data: { id: 'link-1' }, errors: [] }),
        list: vi.fn().mockResolvedValue({ data: [], errors: [] }),
        delete: vi.fn().mockResolvedValue({ data: null, errors: [] }),
      },
    },
  }),
}));

vi.mock('aws-amplify/storage', () => ({
  getUrl: mockGetUrl,
  uploadData: vi.fn().mockResolvedValue({ result: Promise.resolve() }),
}));

vi.mock('aws-amplify/auth', () => ({
  updateUserAttributes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  AdapterDayjs: class AdapterDayjs {},
}));

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@mui/x-date-pickers/MobileTimePicker', () => ({
  MobileTimePicker: () => <div />,
}));

vi.mock('../amplifyConfig', () => ({
  getCloudFrontDomain: () => '',
}));

vi.mock('../utils/recipeDrafts', () => ({
  deleteRecipeDraft: vi.fn().mockResolvedValue(undefined),
  EMPTY_RECIPE_DRAFT: {
    name: '',
    description: '',
    prepTime: '',
    notes: '',
    ingredients: [],
    instructions: [],
    tags: [],
    utensils: [],
    imageUrl: '',
  },
  isRecipeDraftEmpty: () => true,
  loadRecipeDraftsForOwner: vi.fn().mockResolvedValue([]),
  saveRecipeDraft: vi.fn().mockResolvedValue(null),
}));

describe('RecipeBuilder delete undo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecipeList.mockResolvedValue({
      data: [
        {
          id: 'recipe-1',
          ownerId: 'user-1',
          name: 'Pasta',
          description: 'A simple recipe',
          createdBy: 'Test user',
          imageUrl: '',
          prepTime: '15 min',
          tags: [],
          instructions: [],
          ratings: [],
        },
      ],
      errors: [],
    });
    mockRecipeDelete.mockResolvedValue({ data: { id: 'recipe-1' }, errors: [] });
    mockRecipeGet.mockResolvedValue({ data: null, errors: [] });
    mockRecipeCreate.mockResolvedValue({ data: { id: 'recipe-1' }, errors: [] });
    mockRecipeUpdate.mockResolvedValue({ data: { id: 'recipe-1' }, errors: [] });
    mockFavoriteList.mockResolvedValue({ data: [], errors: [] });
    mockFavoriteDelete.mockResolvedValue({ data: null, errors: [] });
    mockFavoriteCreate.mockResolvedValue({ data: null, errors: [] });
    mockGetUrl.mockResolvedValue({ url: new URL('https://example.com/image.jpg') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an undo action after deleting a recipe and restores it', async () => {
    const user = userEvent.setup();

    render(
      <RecipeBuilder
        isAuthenticated
        currentUser={{ userId: 'user-1', username: 'tester' }}
        userAttributes={{ sub: 'user-1', nickname: 'Tester' }}
      />
    );

    expect(await screen.findByText('Pasta')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

    expect(await screen.findByText(/Recipe deleted\./i)).toBeInTheDocument();
    expect(screen.queryByText('Pasta')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo/i }));

    await waitFor(() => expect(screen.getByText('Pasta')).toBeInTheDocument());
  });
});
