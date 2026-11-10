import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import AdminDashboard from '../AdminDashboard';

const mocks = vi.hoisted(() => ({
  recipes: vi.fn(),
  comments: vi.fn(),
  users: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  moderate: vi.fn(),
  recipeGet: vi.fn(),
  featuredGet: vi.fn(),
  featuredCreate: vi.fn(),
  featuredUpdate: vi.fn(),
}));
vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Recipe: {
        get: mocks.recipeGet,
        list: mocks.recipes,
        update: mocks.updateRecipe,
        delete: mocks.deleteRecipe,
      },
      FeaturedRecipe: {
        get: mocks.featuredGet,
        create: mocks.featuredCreate,
        update: mocks.featuredUpdate,
      },
      Comment: {
        list: mocks.comments,
        update: mocks.updateComment,
        delete: mocks.deleteComment,
      },
    },
    queries: { listAdminUsers: mocks.users },
    mutations: { adminActions: mocks.moderate },
  }),
}));

const recipes = Array.from({ length: 12 }, (_, index) => ({
  id: `r${index + 1}`,
  name: `Recipe ${index + 1}`,
  ownerId: 'u1',
  description: 'A community recipe',
  isHidden: index === 11,
}));
const users = [
  {
    id: 'u1',
    userId: 'u1',
    username: 'moon_cook',
    displayName: 'Moon Cook',
    email: 'moon@example.com',
    enabled: true,
  },
  {
    id: 'u2',
    userId: 'u2',
    username: 'spice_mage',
    displayName: 'Spice Mage',
    isBanned: true,
    enabled: false,
    contentHidden: true,
  },
];
const renderAdmin = () =>
  render(<AdminDashboard isAuthenticated isAdmin onBack={vi.fn()} />);

describe('admin console workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recipeGet.mockImplementation(async ({ id }) => ({
      data: recipes.find((recipe) => recipe.id === id) || null,
    }));
    mocks.featuredGet.mockResolvedValue({ data: null });
    mocks.featuredCreate.mockImplementation(async (data) => ({ data }));
    mocks.featuredUpdate.mockImplementation(async (data) => ({ data }));
    mocks.recipes.mockImplementation(async ({ nextToken }) =>
      nextToken
        ? { data: recipes.slice(7) }
        : { data: recipes.slice(0, 7), nextToken: 'more' }
    );
    mocks.comments.mockResolvedValue({
      data: [
        {
          id: 'c1',
          author: '@moon_cook',
          userId: 'u1',
          recipeId: 'r1',
          content: 'Wonderful soup!',
        },
      ],
    });
    mocks.users.mockResolvedValue({ data: users });
    mocks.updateRecipe.mockResolvedValue({
      data: { ...recipes[0], name: 'Updated recipe' },
    });
    mocks.deleteRecipe.mockResolvedValue({ data: recipes[0] });
    mocks.moderate.mockResolvedValue({ data: { success: true } });
  });

  it('does not load privileged data for a non-admin', () => {
    render(<AdminDashboard isAuthenticated isAdmin={false} onBack={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Administrator access required' })
    ).toBeInTheDocument();
    expect(mocks.recipes).not.toHaveBeenCalled();
    expect(mocks.users).not.toHaveBeenCalled();
    expect(mocks.featuredGet).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('region', { name: 'Featured recipe settings' })
    ).not.toBeInTheDocument();
  });

  it('embeds every admin collection without extra page chrome and keeps recipe links on the profile', async () => {
    window.history.replaceState(
      {},
      '',
      '/u/moon_cook?workspace=backrooms&collection=saved'
    );
    const interaction = userEvent.setup();
    const changed = vi.fn();
    render(
      <AdminDashboard
        isAuthenticated
        isAdmin
        embedded
        onBack={vi.fn()}
        onContentChanged={changed}
      />
    );
    await screen.findByText('Showing 1–10 of 12');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'View recipe' })[0]
    ).toHaveAttribute(
      'href',
      '/u/moon_cook?workspace=backrooms&collection=saved&recipe=r1'
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Feature Recipe 1' })
    );
    await screen.findByText('Featured recipe updated.');
    expect(changed).toHaveBeenCalledTimes(1);
    await interaction.click(screen.getByRole('button', { name: /^Comments/ }));
    expect(
      screen.getByRole('link', { name: 'View conversation' })
    ).toHaveAttribute(
      'href',
      '/u/moon_cook?workspace=backrooms&collection=saved&recipe=r1'
    );
    await interaction.click(screen.getByRole('button', { name: /^Users/ }));
    expect(
      screen.getByRole('region', { name: 'User management table' })
    ).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
  });

  it('deduplicates feature writes, confirms success, and lets admins clear the slot', async () => {
    const user = userEvent.setup();
    let finish!: (result: unknown) => void;
    mocks.featuredCreate.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    const feature = screen.getByRole('button', { name: 'Feature Recipe 1' });
    fireEvent.click(feature);
    fireEvent.click(feature);
    await waitFor(() => expect(mocks.featuredCreate).toHaveBeenCalledTimes(1));
    expect(feature).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    expect(
      screen.queryByText('Featured recipe updated.')
    ).not.toBeInTheDocument();
    await act(async () => finish({ data: { id: 'emporium', recipeId: 'r1' } }));
    expect(
      await screen.findByText('Featured recipe updated.')
    ).toBeInTheDocument();
    const settings = screen.getByRole('region', {
      name: 'Featured recipe settings',
    });
    expect(within(settings).getByText('Recipe 1')).toBeInTheDocument();
    mocks.featuredGet.mockResolvedValue({
      data: { id: 'emporium', recipeId: 'r1' },
    });
    await user.click(
      screen.getByRole('button', { name: 'Clear featured recipe' })
    );
    expect(
      await screen.findByText('Featured recipe cleared.')
    ).toBeInTheDocument();
    expect(
      within(settings).getByText('No recipe is currently featured.')
    ).toBeInTheDocument();
    expect(mocks.featuredUpdate).toHaveBeenCalledWith(
      { id: 'emporium', recipeId: null },
      { authMode: 'userPool' }
    );
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(
      screen.getByRole('button', { name: 'Feature Recipe 12' })
    ).toBeDisabled();
  });

  it('keeps the previous feature when a backend write fails', async () => {
    mocks.featuredGet.mockResolvedValue({
      data: { id: 'emporium', recipeId: 'r1' },
    });
    mocks.featuredUpdate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not authorized: internal diagnostics' }],
    });
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: 'Feature Recipe 2' }));
    expect(await screen.findByRole('alert')).not.toHaveTextContent(
      'internal diagnostics'
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Featured recipe settings' })
      ).getByText('Recipe 1')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Featured recipe updated.')
    ).not.toBeInTheDocument();
  });

  it('loads backend pages and supports search, filters, and navigable result pages', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    expect(mocks.recipes).toHaveBeenCalledWith({
      authMode: 'userPool',
      nextToken: 'more',
    });
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(
      screen.getByRole('heading', { name: 'Recipe 12' })
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Search recipes' }),
      'Recipe 12'
    );
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Visibility' }),
      'Visible'
    );
    expect(
      screen.getByRole('heading', { name: 'No matching recipes' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all recipes' }));
    expect(screen.getByText('Showing 1–10 of 12')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'View recipe' })[0]
    ).toHaveAttribute('href', '/discover?recipe=r1');
  });

  it('filters users by moderation state and identity', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Users/ }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Account state' }),
      'Banned'
    );
    expect(screen.getByText('Spice Mage')).toBeInTheDocument();
    expect(screen.queryByText('Moon Cook')).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Account state' }),
      'All'
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Search users' }),
      'moon@example.com'
    );
    expect(screen.getByText('Moon Cook')).toBeInTheDocument();
    expect(screen.queryByText('Spice Mage')).not.toBeInTheDocument();
  });

  it('keeps data when deletion fails and lets confirmation be canceled', async () => {
    const user = userEvent.setup();
    mocks.deleteRecipe.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not authorized: internal details' }],
    });
    renderAdmin();
    const row = (
      await screen.findByRole('heading', { name: 'Recipe 1' })
    ).closest('article')!;
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    expect(mocks.deleteRecipe).not.toHaveBeenCalled();
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm action',
      })
    );
    expect(await screen.findByRole('alert')).not.toHaveTextContent(
      'internal details'
    );
    expect(
      screen.getByRole('heading', { name: 'Recipe 1' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Deleted “Recipe 1”.')).not.toBeInTheDocument();
  });

  it('deduplicates pending saves and reports success after the backend responds', async () => {
    const user = userEvent.setup();
    let finish!: (value: unknown) => void;
    mocks.updateRecipe.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    renderAdmin();
    const row = (
      await screen.findByRole('heading', { name: 'Recipe 1' })
    ).closest('article')!;
    await user.click(within(row).getByRole('button', { name: 'Edit' }));
    const name = screen.getByRole('textbox', { name: 'Recipe name' });
    await user.clear(name);
    await user.type(name, 'Updated recipe');
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(mocks.updateRecipe).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    await act(async () =>
      finish({ data: { ...recipes[0], name: 'Updated recipe' } })
    );
    expect(
      await screen.findByText('Recipe changes saved.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Updated recipe' })
    ).toBeInTheDocument();
  });

  it('transfers ownership through the audited admin operation after confirmation', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Recipe to transfer' }),
      'r1'
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination user' }),
      'u2'
    );
    await user.click(
      screen.getByRole('button', { name: 'Transfer ownership' })
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('spice_mage');
    expect(mocks.moderate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm action' }));
    expect(
      await screen.findByText('Transferred “Recipe 1” to spice_mage.')
    ).toBeInTheDocument();
    expect(mocks.moderate).toHaveBeenCalledWith(
      {
        action: 'transferOwnership',
        transfers: [{ recipeId: 'r1', newOwnerId: 'u2' }],
      },
      { authMode: 'userPool' }
    );
    expect(mocks.updateRecipe).not.toHaveBeenCalled();
  });

  it('keeps previously loaded records visible when refresh fails', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole('heading', { name: 'Recipe 1' });
    mocks.recipes.mockRejectedValue(new Error('Network error'));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Previously loaded records are kept'
    );
    expect(
      screen.getByRole('heading', { name: 'Recipe 1' })
    ).toBeInTheDocument();
  });

  it('updates account status only after successful moderation', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Users/ }));
    const row = screen.getByText('Moon Cook').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Ban' }));
    await user.click(screen.getByRole('button', { name: 'Confirm action' }));
    await waitFor(() =>
      expect(within(row).getByText('Banned')).toBeInTheDocument()
    );
    expect(mocks.moderate).toHaveBeenCalledWith(
      { action: 'ban', userId: 'u1' },
      { authMode: 'userPool' }
    );
    expect(
      within(row).getByRole('button', { name: 'Unban' })
    ).toBeInTheDocument();
  });
});
