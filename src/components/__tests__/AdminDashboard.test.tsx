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
  userProfiles: vi.fn(),
  auditLogs: vi.fn(),
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
      AdminAuditLog: {
        list: mocks.auditLogs,
      },
      UserProfile: {
        list: mocks.userProfiles,
      },
    },
    queries: { listAdminUsers: mocks.users },
    mutations: { adminActions: mocks.moderate },
  }),
}));

const recipes = Array.from({ length: 12 }, (_, index) => ({
  id: `r${index + 1}`,
  name: `Recipe ${index + 1}`,
  ownerId: index === 0 || index === 4 ? 'u1' : 'u5',
  description: 'A community recipe',
  isHidden: index === 11,
}));
const users = [
  {
    userId: 'u1',
    username: 'moon_cook',
    displayName: 'Moon Cook',
    email: 'moon@example.com',
    status: 'CONFIRMED',
    enabled: true,
  },
  {
    userId: 'u2',
    username: 'spice_mage',
    displayName: 'Spice Mage',
    email: 'spice@example.com',
    status: 'FORCE_CHANGE_PASSWORD',
    enabled: false,
  },
  {
    userId: 'u3',
    username: 'cedar_sage',
    displayName: 'Cedar Sage',
    email: 'cedar@example.com',
    status: 'CONFIRMED',
    enabled: true,
  },
  {
    userId: 'u4',
    username: 'gone_grill',
    displayName: 'Gone Grill',
    email: 'gone@example.com',
    status: 'CONFIRMED',
    enabled: true,
  },
];
const profiles = [
  {
    userId: 'u1',
    username: 'moon_cook',
    isBanned: false,
    isDeleted: false,
    contentHidden: false,
  },
  {
    userId: 'u2',
    username: 'spice_mage',
    isBanned: true,
    isDeleted: false,
    contentHidden: true,
  },
  {
    userId: 'u4',
    username: 'gone_grill',
    isBanned: false,
    isDeleted: true,
    contentHidden: false,
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
    mocks.userProfiles.mockResolvedValue({ data: profiles });
    mocks.auditLogs.mockResolvedValue({ data: [] });
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
    expect(mocks.userProfiles).not.toHaveBeenCalled();
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
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    expect(mocks.recipes).toHaveBeenCalledWith({
      authMode: 'userPool',
      nextToken: 'more',
    });
    const pageNav = screen.getByRole('navigation', {
      name: 'Collection pages',
    });
    await user.click(
      within(pageNav).getByRole('button', { name: 'Next page' })
    );
    expect(
      screen.getByRole('heading', { name: 'Recipe 12' })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search recipes' }), {
      target: { value: 'Recipe 12' },
    });
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
    const user = userEvent.setup({ delay: null });
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Search users' }), {
      target: { value: 'moon@example.com' },
    });
    expect(screen.getByText('Moon Cook')).toBeInTheDocument();
    expect(screen.queryByText('Spice Mage')).not.toBeInTheDocument();
  });

  it('keeps data when deletion fails and lets confirmation be canceled', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.deleteRecipe.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not authorized: internal details' }],
    });
    renderAdmin();
    const row = (
      await screen.findByRole('heading', { name: 'Recipe 1' })
    ).closest('article')!;
    await user.click(
      within(row).getByRole('button', { name: 'More actions for Recipe 1' })
    );
    await user.click(
      within(row).getByRole('menuitem', { name: 'Delete recipe…' })
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    expect(mocks.deleteRecipe).not.toHaveBeenCalled();
    await user.click(
      within(row).getByRole('button', { name: 'More actions for Recipe 1' })
    );
    await user.click(
      within(row).getByRole('menuitem', { name: 'Delete recipe…' })
    );
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
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    const row = (
      await screen.findByRole('heading', { name: 'Recipe 1' })
    ).closest('article')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'Transfer Recipe 1 from Moon Cook',
      })
    );
    await user.click(within(row).getByRole('button', { name: /Cedar Sage/ }));
    const reassign = within(row).getByRole('button', {
      name: 'Reassign to Cedar Sage',
    });
    await user.click(reassign);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('cedar_sage');
    expect(mocks.moderate).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirm action' })
    );
    expect(
      await screen.findByText('Transferred “Recipe 1” to cedar_sage.')
    ).toBeInTheDocument();
    expect(mocks.moderate).toHaveBeenCalledWith(
      {
        action: 'transferOwnership',
        transfers: [{ recipeId: 'r1', newOwnerId: 'u3' }],
      },
      { authMode: 'userPool' }
    );
    expect(mocks.updateRecipe).not.toHaveBeenCalled();
    expect(
      within(row).getByRole('button', {
        name: 'Transfer Recipe 1 from Cedar Sage',
      })
    ).toBeInTheDocument();
  });

  it('excludes the owner, banned, and deleted accounts from transfer destinations', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    const row = (
      await screen.findByRole('heading', { name: 'Recipe 1' })
    ).closest('article')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'Transfer Recipe 1 from Moon Cook',
      })
    );
    expect(
      within(row).getByRole('button', { name: /cedar@example.com/ })
    ).toBeInTheDocument();
    expect(
      within(row).queryByRole('button', { name: /moon@example.com/ })
    ).not.toBeInTheDocument();
    expect(
      within(row).queryByRole('button', { name: /spice@example.com/ })
    ).not.toBeInTheDocument();
    expect(
      within(row).queryByRole('button', { name: /gone@example.com/ })
    ).not.toBeInTheDocument();

    const search = within(row).getByPlaceholderText(
      'Search name, handle, or email'
    );
    await user.type(search, 'spice');
    expect(
      within(row).getByText('No cooks match that search.')
    ).toBeInTheDocument();
    expect(mocks.moderate).not.toHaveBeenCalled();
  });

  it('keeps previously loaded records visible when refresh fails', async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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

  it('hides recipes through direct updates without showing raw IDs on cards', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.updateRecipe.mockResolvedValue({
      data: { ...recipes[0], isHidden: true },
    });
    renderAdmin();
    const row = (
      await screen.findByRole('heading', { name: 'Recipe 1' })
    ).closest('article')!;
    expect(within(row).queryByText('u1')).not.toBeInTheDocument();
    expect(within(row).queryByText('r1')).not.toBeInTheDocument();
    await user.click(
      within(row).getByRole('button', { name: 'Hide Recipe 1' })
    );
    expect(mocks.updateRecipe).toHaveBeenCalledWith(
      { id: 'r1', isHidden: true },
      { authMode: 'userPool' }
    );
    expect(await within(row).findByText('Hidden')).toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: 'Unhide Recipe 1' })
    ).toBeInTheDocument();
  });

  it('exposes labelled 44px rail targets and shows the active panel title in the header', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');

    const recipesRail = screen.getByRole('button', { name: 'Recipes · 12' });
    const commentsRail = screen.getByRole('button', { name: 'Comments · 1' });
    const usersRail = screen.getByRole('button', { name: 'Users · 4' });
    const activityRail = screen.getByRole('button', { name: 'Activity log' });

    for (const railButton of [
      recipesRail,
      commentsRail,
      usersRail,
      activityRail,
    ]) {
      expect(railButton).toHaveClass('min-h-11', 'min-w-11');
      expect(
        within(railButton).getByRole('tooltip', { hidden: true })
      ).toBeInTheDocument();
    }

    expect(recipesRail).toHaveAttribute('aria-pressed', 'true');

    // The active color is memoized per mount and must not be re-rolled
    // when unrelated state (the search input) re-renders the rail.
    const activeStyleBefore = recipesRail.getAttribute('style');
    expect(activeStyleBefore).toContain('background-color');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search recipes' }), {
      target: { value: 'x' },
    });
    expect(recipesRail.getAttribute('style')).toBe(activeStyleBefore);

    await user.click(usersRail);
    expect(
      screen.getByRole('heading', { name: 'Users', level: 2 })
    ).toBeInTheDocument();
    expect(usersRail).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a Reports placeholder with status pills and no search controls', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');

    const reportsRail = screen.getByRole('button', {
      name: 'Reports · 0 open',
    });
    expect(reportsRail).toHaveClass('min-h-11', 'min-w-11');
    await user.click(reportsRail);

    expect(
      screen.getByRole('heading', { name: 'Reports', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Concerns raised by your community')
    ).toBeInTheDocument();
    expect(screen.getByText('No open reports')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Search reports' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Visibility' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resolved' }));
    expect(screen.getByText('No resolved reports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('edits and toggles comment visibility through the card actions', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.updateComment.mockImplementation(async (input: any) => ({
      data: { id: 'c1', ...input },
    }));
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Comments/ }));

    expect(screen.getByText('@moon_cook')).toBeInTheDocument();
    expect(screen.getByText('Wonderful soup!')).toBeInTheDocument();
    const card = screen.getByText('Wonderful soup!').closest('article')!;
    expect(card).toHaveTextContent('On recipe r1…');
    expect(
      within(card).getByRole('link', { name: 'View conversation' })
    ).toHaveAttribute('href', '/discover?recipe=r1');
    expect(within(card).getByText('Visible')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Edit' }));
    fireEvent.change(
      within(card).getByRole('textbox', { name: 'Comment content' }),
      { target: { value: 'Edited soup!' } }
    );
    await user.click(within(card).getByRole('button', { name: 'Save' }));
    expect(mocks.updateComment).toHaveBeenCalledWith(
      { id: 'c1', content: 'Edited soup!' },
      { authMode: 'userPool' }
    );
    expect(
      await screen.findByText('Comment changes saved.')
    ).toBeInTheDocument();

    await user.click(
      within(card).getByRole('button', { name: 'Hide comment by @moon_cook' })
    );
    expect(mocks.updateComment).toHaveBeenLastCalledWith(
      { id: 'c1', isHidden: true },
      { authMode: 'userPool' }
    );
    expect(
      await screen.findByText('Hid comment by @moon_cook.')
    ).toBeInTheDocument();
    expect(within(card).getByText('Hidden')).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Show comment by @moon_cook' })
    ).toBeInTheDocument();

    await user.click(
      within(card).getByRole('button', { name: 'Show comment by @moon_cook' })
    );
    expect(mocks.updateComment).toHaveBeenLastCalledWith(
      { id: 'c1', isHidden: false },
      { authMode: 'userPool' }
    );
    expect(
      await screen.findByText('Restored comment by @moon_cook.')
    ).toBeInTheDocument();
    expect(within(card).getByText('Visible')).toBeInTheDocument();
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('deletes a comment through the more menu after confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.deleteComment.mockResolvedValue({ data: { id: 'c1' } });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Comments/ }));

    await user.click(
      screen.getByRole('button', {
        name: 'More actions for comment by @moon_cook',
      })
    );
    await user.click(screen.getByRole('menuitem', { name: 'Delete comment…' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('permanently delete this comment');
    expect(mocks.deleteComment).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirm action' })
    );
    expect(mocks.deleteComment).toHaveBeenCalledWith(
      { id: 'c1' },
      { authMode: 'userPool' }
    );
    expect(await screen.findByText('Comment deleted.')).toBeInTheDocument();
    expect(await screen.findByText('No comments found.')).toBeInTheDocument();
  });

  it('lazy-loads the activity log, renders audit entries, and filters by category', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.auditLogs.mockResolvedValue({
      data: [
        {
          id: 'a1',
          actorUserId: 'u1',
          action: 'transferOwnership',
          targetType: 'RecipeBatch',
          targetId: 'r1',
          createdAt: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 'a2',
          actorUserId: 'u2',
          action: 'ban',
          targetType: 'UserProfile',
          targetId: 'u1',
          createdAt: '2026-01-02T11:00:00.000Z',
        },
      ],
    });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    expect(mocks.auditLogs).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Activity log' }));
    expect(
      screen.getByRole('heading', { name: 'Activity log', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Admin actions recorded in the audit log')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Transferred ownership')
    ).toBeInTheDocument();
    expect(screen.getByText('Banned account')).toBeInTheDocument();
    expect(mocks.auditLogs).toHaveBeenCalledWith({
      authMode: 'userPool',
      limit: 20,
      nextToken: undefined,
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Category' }),
      'Reassignments'
    );
    expect(screen.getByText('Transferred ownership')).toBeInTheDocument();
    expect(screen.queryByText('Banned account')).not.toBeInTheDocument();
  });

  it('pages the activity log by nextToken through Load more', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.auditLogs
      .mockResolvedValueOnce({
        data: [
          {
            id: 'a1',
            actorUserId: 'u1',
            action: 'transferOwnership',
            targetType: 'RecipeBatch',
            targetId: 'r1',
            createdAt: '2026-01-01T10:00:00.000Z',
          },
        ],
        nextToken: 'audit-page-2',
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'a2',
            actorUserId: 'u2',
            action: 'ban',
            targetType: 'UserProfile',
            targetId: 'u4',
            createdAt: '2026-01-02T11:00:00.000Z',
          },
        ],
        nextToken: undefined,
      });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: 'Activity log' }));

    expect(
      await screen.findByText('Transferred ownership')
    ).toBeInTheDocument();
    expect(mocks.auditLogs).toHaveBeenCalledTimes(1);
    expect(mocks.auditLogs).toHaveBeenCalledWith({
      authMode: 'userPool',
      limit: 20,
      nextToken: undefined,
    });

    const loadMore = screen.getByRole('button', { name: 'Load more' });
    await user.click(loadMore);
    expect(await screen.findByText('Banned account')).toBeInTheDocument();
    expect(mocks.auditLogs).toHaveBeenCalledTimes(2);
    expect(mocks.auditLogs).toHaveBeenLastCalledWith({
      authMode: 'userPool',
      limit: 20,
      nextToken: 'audit-page-2',
    });
    expect(
      screen.queryByRole('button', { name: 'Load more' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Transferred ownership')).toBeInTheDocument();
  });

  it('merges UserProfile moderation flags onto Cognito rows', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Users/ }));
    expect(mocks.userProfiles).toHaveBeenCalled();
    const row = screen.getByText('Spice Mage').closest('tr')!;
    expect(within(row).getByText('Banned')).toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: 'Unban' })
    ).toBeInTheDocument();
    expect(within(row).getByText('Content hidden')).toBeInTheDocument();
  });

  it('labels accounts with a pending password change', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Users/ }));
    const row = screen.getByText('Spice Mage').closest('tr')!;
    expect(
      within(row).getByText('Password change pending')
    ).toBeInTheDocument();
    const activeRow = screen.getByText('Moon Cook').closest('tr')!;
    expect(
      within(activeRow).queryByText('Password change pending')
    ).not.toBeInTheDocument();
  });

  it('gates deletion behind a typed email and keeps reassignment optional', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Users/ }));
    expect(
      screen.getByRole('columnheader', { name: 'Danger zone' })
    ).toBeInTheDocument();
    const row = screen.getByText('Moon Cook').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Delete user' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      'disables the account and hides their content'
    );
    expect(dialog).toHaveTextContent(/\b2 recipes\b/);
    expect(dialog).toHaveTextContent('reversible');
    const confirm = within(dialog).getByRole('button', {
      name: 'Delete account',
    });
    expect(confirm).toBeDisabled();
    const input = within(dialog).getByRole('textbox', {
      name: 'Type the account email to confirm deletion',
    });
    await user.type(input, 'wrong@example.com');
    expect(confirm).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'moon@example.com');
    expect(confirm).toBeEnabled();

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Reassign first (recommended)',
      })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.moderate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Recipes', level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search recipes' })).toHaveValue(
      'moon_cook'
    );
    expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    expect(screen.getByText('Recipe 5')).toBeInTheDocument();
    expect(screen.queryByText('Recipe 2')).not.toBeInTheDocument();
    expect(screen.getByText('2 of 12 recipes')).toBeInTheDocument();
  });

  it('deletes a user only after the typed email matches', async () => {
    const user = userEvent.setup({ delay: null });
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');
    await user.click(screen.getByRole('button', { name: /^Users/ }));
    const row = screen.getByText('Moon Cook').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Delete user' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: 'Delete account',
    });
    const input = within(dialog).getByRole('textbox', {
      name: 'Type the account email to confirm deletion',
    });
    await user.type(input, 'moon@example.com');
    await user.click(confirm);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Updated moderation for moon_cook.'
    );
    expect(mocks.moderate).toHaveBeenCalledWith(
      { action: 'delete', userId: 'u1' },
      { authMode: 'userPool' }
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
