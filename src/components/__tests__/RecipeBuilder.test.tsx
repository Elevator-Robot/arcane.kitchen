import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  render,
  defaultRecipeBuilderProps,
  unauthenticatedRecipeBuilderProps,
  mockUserAttributes,
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

const {
  mockRecipeList,
  mockRecipeGet,
  mockFavoriteList,
  mockUserProfileList,
  mockRecipeGetUrl,
  mockRecipeUploadData,
} = vi.hoisted(() => ({
  mockRecipeList: vi.fn().mockResolvedValue({ data: [], errors: undefined }),
  mockRecipeGet: vi.fn().mockResolvedValue({ data: null, errors: undefined }),
  mockFavoriteList: vi.fn().mockResolvedValue({ data: [], errors: undefined }),
  mockUserProfileList: vi
    .fn()
    .mockResolvedValue({ data: [], errors: undefined }),
  mockRecipeGetUrl: vi
    .fn()
    .mockResolvedValue({ url: new URL('https://example.com/image.jpg') }),
  mockRecipeUploadData: vi
    .fn()
    .mockReturnValue({ result: Promise.resolve({ path: 'test-path' }) }),
}));

const mockRecipeStorageConfig = vi.hoisted(() =>
  vi.fn(() => ({ Storage: {} }))
);
const mockCreateObjectURL = vi.fn(
  (value: Blob | File) => `blob:${value.size ?? 'mock'}`
);
const mockRevokeObjectURL = vi.fn();
const NativeURL = globalThis.URL;

vi.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: mockRecipeStorageConfig,
  },
}));

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Recipe: {
        list: mockRecipeList,
        get: mockRecipeGet,
        create: vi
          .fn()
          .mockResolvedValue({ data: { id: 'new-id' }, errors: undefined }),
        update: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        delete: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
      },
      Ingredient: {
        create: vi.fn().mockResolvedValue({
          data: { id: 'ing-1' },
          errors: undefined,
        }),
        get: vi.fn().mockResolvedValue({
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
        list: mockFavoriteList,
        create: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        delete: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
      },
      UserProfile: {
        list: mockUserProfileList,
        create: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        update: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
        delete: vi.fn().mockResolvedValue({ data: {}, errors: undefined }),
      },
    },
  }),
}));

vi.mock('aws-amplify/storage', () => ({
  getUrl: mockRecipeGetUrl,
  uploadData: mockRecipeUploadData,
}));

const { mockUpdateUserAttributes } = vi.hoisted(() => ({
  mockUpdateUserAttributes: vi.fn().mockResolvedValue({}),
}));

vi.mock('aws-amplify/auth', async () => {
  const actual =
    await vi.importActual<typeof import('aws-amplify/auth')>(
      'aws-amplify/auth'
    );
  return {
    ...actual,
    updateUserAttributes: mockUpdateUserAttributes,
  };
});

Object.defineProperty(globalThis, 'URL', {
  configurable: true,
  value: class extends NativeURL {
    static createObjectURL = mockCreateObjectURL;
    static revokeObjectURL = mockRevokeObjectURL;
  },
});

const renderRecipeBuilder = async (props: Record<string, unknown> = {}) => {
  const { default: RecipeBuilder } = await import('../RecipeBuilder');
  return render(<RecipeBuilder {...(props as any)} />);
};

describe('RecipeBuilder Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    mockRecipeList.mockResolvedValue({ data: [], errors: undefined });
    mockRecipeGet.mockResolvedValue({ data: null, errors: undefined });
    mockFavoriteList.mockResolvedValue({ data: [], errors: undefined });
    mockUserProfileList.mockResolvedValue({ data: [], errors: undefined });
    mockUpdateUserAttributes.mockClear();
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('arcaneKitchenDraft');
    }
  });

  it('renders the social recipe workspace', async () => {
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    expect(await screen.findByText('Arcane Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Search recipes')).toBeInTheDocument();
    expect(screen.getByTitle('Create a recipe')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Search recipes' })
    ).toBeInTheDocument();
  }, 40000);

  it('clears search and reverses recipe sorting from the search control', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    const searchInput = screen.getByRole('textbox', { name: 'Search recipes' });
    await user.type(searchInput, 'soup');
    expect(searchInput).toHaveValue('soup');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(searchInput).toHaveValue('');

    await user.click(
      screen.getByRole('button', { name: /Sort recipes: newest first/i })
    );
    expect(
      screen.getByRole('button', { name: /Sort recipes: oldest first/i })
    ).toBeInTheDocument();
  });

  it('reports successful searches accurately and clears an empty search', async () => {
    mockRecipeList.mockResolvedValue({
      data: [createMockRecipe({ name: 'Lemon pasta' })],
    });
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);
    await screen.findByRole('heading', { name: 'Lemon pasta' });
    const search = screen.getByRole('textbox', { name: 'Search recipes' });
    await user.type(search, 'lemon');
    expect(
      await screen.findByText('1 recipe found for “lemon”')
    ).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'zzzzzz');
    expect(
      await screen.findByText('No recipes match just yet')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(
      await screen.findByRole('heading', { name: 'Lemon pasta' })
    ).toBeInTheDocument();
  });

  it('does not match unrelated recipes against the viewing cook username', async () => {
    mockRecipeList.mockResolvedValue({
      data: [
        createMockRecipe({
          name: 'Lemon pasta',
          description: 'Zesty citrus noodles',
          createdBy: 'another_cook',
        }),
      ],
    });
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);
    await screen.findByRole('heading', { name: 'Lemon pasta' });
    await user.type(
      screen.getByRole('textbox', { name: 'Search recipes' }),
      '@test'
    );
    expect(
      await screen.findByText('No recipes match just yet')
    ).toBeInTheDocument();
  });

  it('shows a recoverable feed failure and retries successfully', async () => {
    mockRecipeList.mockRejectedValue(new Error('network unavailable'));
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The kitchen is taking a moment'
    );
    mockRecipeList.mockResolvedValue({
      data: [createMockRecipe({ name: 'Recovered recipe' })],
    });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Recovered recipe' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes a recipe with Escape and returns to its base route', async () => {
    mockRecipeList.mockResolvedValue({ data: [createMockRecipe()] });
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);
    await user.click(
      await screen.findByRole('heading', { name: 'Test Recipe' })
    );
    expect(
      await screen.findByRole('dialog', { name: 'Test Recipe' })
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('invites guests to sign in for personal filters', async () => {
    const onRequestAuth = vi.fn();
    const user = userEvent.setup();
    await renderRecipeBuilder({
      ...unauthenticatedRecipeBuilderProps,
      onRequestAuth,
    });
    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(onRequestAuth).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows catwitch recovery for unavailable recipes linked from a collection', async () => {
    window.history.replaceState({}, '', '/saved?recipe=missing');
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);
    const dialog = await screen.findByRole('dialog', {
      name: 'Recipe unavailable',
    });
    expect(
      within(dialog).getByRole('img', { name: /Two cats in witch hats/ })
    ).toHaveAttribute('src', '/images/catwitch.webp');
    await user.click(
      within(dialog).getByRole('button', { name: 'Back to collection' })
    );
    expect(window.location.pathname).toBe('/saved');
    expect(window.location.search).toBe('');
  });

  it('opens the editor from search and returns contextually', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    await user.click(screen.getByRole('button', { name: 'Create a recipe' }));

    expect(window.location.pathname).toBe('/build');
    expect(
      screen.getByRole('heading', { name: 'New recipe' })
    ).toBeInTheDocument();
    expect(screen.getByText('by test')).toBeInTheDocument();
    expect(screen.queryByText('by @test')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to recipes' }));

    expect(window.location.pathname).toBe('/discover');
    expect(screen.getByText('Search recipes')).toBeInTheDocument();
  });

  it('updates the post preview as recipe fields change', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    const nameInput = screen.getAllByPlaceholderText(
      "e.g., Grandma's Apple Pie"
    )[0];
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

    expect(screen.getAllByLabelText('Ingredient').length).toBeLessThanOrEqual(
      ingredientFields.length
    );
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

    expect(window.location.pathname + window.location.search).toBe(
      '/discover?recipe=recipe-1'
    );
  });

  it('opens a recipe in-place from the profile page without a hard navigation', async () => {
    const user = userEvent.setup();
    mockRecipeList.mockResolvedValue({
      data: [createMockRecipe({ name: 'Test Recipe' })],
      errors: undefined,
    });

    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: 'Profile' }));

    const card = (await screen.findAllByText('Test Recipe'))[0];
    await user.click(card);

    expect(window.location.pathname + window.location.search).toBe(
      '/u/test?recipe=recipe-1'
    );
  });

  it('filters by recipe author before opening the public profile page', async () => {
    const authorProfile = {
      userId: 'author-user',
      username: 'recipe_author',
      displayName: 'Recipe Author',
      bio: 'Author bio',
      avatar: null,
      needsUsernameSetup: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockRecipeList.mockResolvedValue({
      data: [
        createMockRecipe({
          ownerId: authorProfile.userId,
          createdBy: '@recipe_author',
        }),
        createMockRecipe({
          id: 'recipe-2',
          ownerId: 'another-user',
          name: 'Another Recipe',
          createdBy: '@another_author',
        }),
      ],
      errors: undefined,
    });
    mockFavoriteList.mockResolvedValue({
      data: [
        {
          id: 'favorite-1',
          recipeId: 'recipe-1',
          userId: 'testuser',
        },
      ],
      errors: undefined,
    });
    mockUserProfileList.mockImplementation(async (options = {}) => {
      const username = (options as any).filter?.username?.eq;
      return {
        data:
          !username || username === authorProfile.username
            ? [authorProfile]
            : [],
        errors: undefined,
      };
    });
    window.history.replaceState({}, '', '/saved');

    const user = userEvent.setup();
    await renderRecipeBuilder(defaultRecipeBuilderProps);

    const savedSection = document.getElementById('saved-recipes');
    expect(savedSection).not.toBeNull();
    await user.click(
      await within(savedSection!).findByRole('button', {
        name: 'by @recipe_author',
      })
    );

    expect(window.location.pathname).toBe('/discover');
    expect(
      await screen.findByRole('button', {
        name: 'Clear author collection @recipe_author',
      })
    ).toBeInTheDocument();
    expect(screen.queryByText('Another Recipe')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Clear author collection @recipe_author',
      })
    );
    expect(await screen.findByText('Another Recipe')).toBeInTheDocument();

    const discoverSection = document.getElementById('discover');
    expect(discoverSection).not.toBeNull();
    await user.click(
      within(discoverSection!).getByRole('button', {
        name: 'by @recipe_author',
      })
    );
    await user.click(
      await screen.findByRole('link', { name: 'View author profile' })
    );

    expect(window.location.pathname).toBe('/u/recipe_author');
    expect(await screen.findByLabelText('recipe_author')).toBeInTheDocument();
    const profileSection = document.getElementById('profile');
    expect(profileSection).not.toBeNull();
    expect(
      within(profileSection!).queryByRole('button', { name: 'Drafts' })
    ).not.toBeInTheDocument();
    expect(
      within(profileSection!).queryByRole('button', { name: 'Saved' })
    ).not.toBeInTheDocument();
  });

  it('keeps an invalid shared recipe on its route instead of redirecting home', async () => {
    mockRecipeGet.mockResolvedValue({
      data: null,
      errors: [{ message: 'not found' }],
    });

    window.history.replaceState({}, '', '/recipe/does-not-exist');

    await renderRecipeBuilder(defaultRecipeBuilderProps);

    expect(
      await screen.findByText('Recipe could not be found.')
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/recipe/does-not-exist');
  });

  it('uploads recipe images with an authenticated storage access level', async () => {
    const user = userEvent.setup();
    mockRecipeUploadData.mockClear();

    await renderRecipeBuilder(defaultRecipeBuilderProps);

    const titleInput = screen.getAllByPlaceholderText(
      "e.g., Grandma's Apple Pie"
    )[0];
    await user.type(titleInput, 'Cloudy Pie');

    const addIngredientButton = screen.getAllByRole('button', {
      name: 'Add',
    })[0];
    await user.click(addIngredientButton);

    const ingredientInput = screen.getAllByLabelText('Ingredient')[0];
    await user.type(ingredientInput, 'Flour');

    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const imageFile = new File(['image-data'], 'cloudy-pie.png', {
      type: 'image/png',
    });
    await user.upload(fileInput!, imageFile);

    await user.click(screen.getByRole('button', { name: /publish/i }));

    expect(mockRecipeUploadData).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^recipe-images\//),
        data: imageFile,
        options: expect.objectContaining({
          accessLevel: 'protected',
          contentType: 'image/png',
        }),
      })
    );
  });

  it('copies the shared recipe link with immediate feedback', async () => {
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

    expect(await screen.findByText('Copied!')).toBeInTheDocument();
    expect(clipboardWriteText).toHaveBeenCalledWith(
      expect.stringContaining('recipe-1')
    );
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
    await user.click(
      await screen.findByRole('link', { name: 'Saved recipes' })
    );

    expect(await screen.findByText('Saved recipes')).toBeInTheDocument();
    expect(screen.getAllByText('Saved Recipe').length).toBeGreaterThan(0);
  }, 20000);

  it('autosaves recipe drafts and restores them from the drafts view', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: 'Create a recipe' }));

    const titleInput = screen.getAllByPlaceholderText(
      "e.g., Grandma's Apple Pie"
    )[0];
    await user.type(titleInput, 'Moonlit Porridge');

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(
      await screen.findByRole('link', { name: 'Recipe drafts' })
    );

    const draftsHeading = await screen.findByRole('heading', {
      name: 'Drafts',
    });
    expect(draftsHeading).toBeInTheDocument();

    const draftsSection = draftsHeading.closest('section');
    expect(draftsSection).not.toBeNull();

    expect(
      await within(draftsSection as HTMLElement).findByText('Moonlit Porridge')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resume' }));

    expect(
      screen.getAllByDisplayValue('Moonlit Porridge')[0]
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(screen.getByRole('link', { name: 'Recipe drafts' }));
    await user.click(
      within(document.getElementById('drafts')!).getByRole('button', {
        name: 'Delete',
      })
    );

    expect(screen.queryByText('Moonlit Porridge')).not.toBeInTheDocument();
  }, 20000);

  it('removes the active draft after publishing', async () => {
    const user = userEvent.setup();
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test-draft');
    const revokeObjectUrlSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: 'Create a recipe' }));

    const titleInput = screen.getAllByPlaceholderText(
      "e.g., Grandma's Apple Pie"
    )[0];
    await user.type(titleInput, 'Published Draft');

    const descriptionInput = screen.getByPlaceholderText(
      'A short summary of your dish'
    );
    await user.type(descriptionInput, 'A draft that will be published');

    const ingredientAmount = screen.getByLabelText('Amount');
    const ingredientUnit = screen.getByLabelText('Unit');
    const ingredientName = screen.getByLabelText('Ingredient');
    await user.type(ingredientAmount, '2');
    await user.type(ingredientUnit, 'cups');
    await user.type(ingredientName, 'Flour');

    const addPhotoDropzone = screen.getByRole('button', { name: 'Add Photo' });
    const fileInput = addPhotoDropzone.parentElement?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const imageFile = new File(['draft-image'], 'draft-image.jpg', {
      type: 'image/jpeg',
    });
    await user.upload(fileInput as HTMLInputElement, imageFile);

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(
      await screen.findByRole('link', { name: 'Recipe drafts' })
    );
    const draftsHeading = await screen.findByRole('heading', {
      name: 'Drafts',
    });
    const draftsSection = draftsHeading.closest('section');
    expect(draftsSection).not.toBeNull();
    expect(
      await within(draftsSection as HTMLElement).findByText('Published Draft')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(
      await screen.findByRole('link', { name: 'Recipe drafts' })
    );
    const refreshedDraftsHeading = await screen.findByRole('heading', {
      name: 'Drafts',
    });
    const refreshedDraftsSection = refreshedDraftsHeading.closest('section');
    expect(refreshedDraftsSection).not.toBeNull();
    expect(
      within(refreshedDraftsSection as HTMLElement).queryByText(
        'Published Draft'
      )
    ).not.toBeInTheDocument();

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  }, 20000);

  it('prompts unauthenticated users to sign in before creating', async () => {
    await renderRecipeBuilder(unauthenticatedRecipeBuilderProps);

    expect(
      screen.getAllByRole('button', { name: 'Sign in to create' })[0]
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start publishing your own recipes')
    ).toBeInTheDocument();
  }, 10000);

  it('saves and displays the selected profile picture preset', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: 'Profile' }));

    await user.click(
      await screen.findByRole('button', { name: /update avatar/i })
    );

    const modal = (await screen.findByText('Update Profile Picture')).closest(
      'div.fixed'
    );
    expect(modal).not.toBeNull();

    const presetImg = within(modal as HTMLElement).getAllByRole('img', {
      name: /\.webp$/i,
    })[0];
    const chosenFile = presetImg.getAttribute('alt');
    expect(chosenFile).toBeTruthy();

    await user.click(presetImg);
    await user.click(
      within(modal as HTMLElement).getByRole('button', { name: 'Save Picture' })
    );

    const saved = JSON.parse(
      window.localStorage.getItem('arcaneKitchen.userProfiles') || '{}'
    );
    expect(saved['testuser'].avatar).toBe(chosenFile);

    const headerAvatar = screen
      .getByRole('button', { name: 'Account for test' })
      .querySelector('img')!;
    expect(headerAvatar.getAttribute('src')).toContain(chosenFile as string);

    expect(mockUpdateUserAttributes).toHaveBeenCalledWith({
      userAttributes: { 'custom:avatar': chosenFile },
    });
  }, 20000);

  it('updates and persists the username from the profile header', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'arcaneKitchen.userProfiles',
      JSON.stringify({
        testuser: {
          userId: 'testuser',
          username: 'test',
          displayName: 'Test cook',
          bio: '',
          avatar: null,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
          needsUsernameSetup: false,
          lastUsernameChange: new Date('2020-01-01').getTime(),
        },
      })
    );
    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: 'Profile' }));

    await user.click(
      await screen.findByRole('button', { name: /edit username/i })
    );
    const nameInput = screen.getByRole('textbox', { name: 'Username' });
    expect(nameInput).toHaveValue('test');
    await user.clear(nameInput);
    await user.type(nameInput, 'mystic_chef');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', { name: 'mystic_chef' })
    ).toBeInTheDocument();

    const saved = JSON.parse(
      window.localStorage.getItem('arcaneKitchen.userProfiles') || '{}'
    );
    expect(saved['testuser'].username).toBe('mystic_chef');
    expect(window.location.pathname).toBe('/u/mystic_chef');
  }, 20000);

  it('shows a newly selected picture even when a stale avatar was synced to Cognito', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      userAttributes: { ...mockUserAttributes, 'custom:avatar': 'old.webp' },
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: 'Profile' }));

    await user.click(
      await screen.findByRole('button', { name: /update avatar/i })
    );

    const modal = (await screen.findByText('Update Profile Picture')).closest(
      'div.fixed'
    );
    const presetImg = within(modal as HTMLElement)
      .getAllByRole('img', {
        name: /\.webp$/i,
      })
      .find((img) => img.getAttribute('alt') !== 'old.webp')!;
    const chosenFile = presetImg.getAttribute('alt');
    expect(chosenFile).toBeTruthy();

    await user.click(presetImg);
    await user.click(
      within(modal as HTMLElement).getByRole('button', { name: 'Save Picture' })
    );

    const headerAvatar = screen
      .getByRole('button', { name: 'Account for test' })
      .querySelector('img')!;
    expect(headerAvatar.getAttribute('src')).toContain(chosenFile as string);
  }, 20000);

  it('adds and persists the profile bio', async () => {
    const user = userEvent.setup();
    await renderRecipeBuilder({
      ...defaultRecipeBuilderProps,
      onSignOut: vi.fn(),
    });

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: 'Profile' }));

    await user.click(await screen.findByRole('button', { name: /edit bio/i }));
    await user.type(screen.getByLabelText('bio'), 'Brewer of arcane stews');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Brewer of arcane stews')
    ).toBeInTheDocument();

    const saved = JSON.parse(
      window.localStorage.getItem('arcaneKitchen.userProfiles') || '{}'
    );
    expect(saved['testuser'].bio).toBe('Brewer of arcane stews');

    expect(mockUpdateUserAttributes).toHaveBeenCalledWith({
      userAttributes: { 'custom:bio': 'Brewer of arcane stews' },
    });
  }, 20000);
});
