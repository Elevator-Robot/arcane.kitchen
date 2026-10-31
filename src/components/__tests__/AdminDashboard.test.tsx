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

vi.setConfig({ testTimeout: 15000 });

const mocks = vi.hoisted(() => ({
  recipes: vi.fn(),
  comments: vi.fn(),
  users: vi.fn(),
  auditLogs: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  moderate: vi.fn(),
}));
vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Recipe: {
        list: mocks.recipes,
        update: mocks.updateRecipe,
        delete: mocks.deleteRecipe,
      },
      Comment: {
        list: mocks.comments,
        update: mocks.updateComment,
        delete: mocks.deleteComment,
      },
      AdminAuditLog: {
        list: mocks.auditLogs,
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
    await user.click(
      screen.getByRole('button', {
        name: 'Transfer Recipe 1 from Moon Cook',
      })
    );
    await user.click(screen.getByRole('button', { name: /Spice Mage/ }));
    const reassign = screen.getByRole('button', {
      name: 'Reassign to Spice Mage',
    });
    await user.click(reassign);
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
    expect(
      screen.getByRole('button', {
        name: 'Transfer Recipe 1 from Spice Mage',
      })
    ).toBeInTheDocument();
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

  it('hides recipes through direct updates without showing raw IDs on cards', async () => {
    const user = userEvent.setup();
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
    renderAdmin();
    await screen.findByText('Showing 1–10 of 12');

    const recipesRail = screen.getByRole('button', { name: 'Recipes · 12' });
    const commentsRail = screen.getByRole('button', { name: 'Comments · 1' });
    const usersRail = screen.getByRole('button', { name: 'Users · 2' });
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
    await userEvent.click(usersRail);
    expect(
      screen.getByRole('heading', { name: 'Users', level: 2 })
    ).toBeInTheDocument();
    expect(usersRail).toHaveAttribute('aria-pressed', 'true');
  });

  it('lazy-loads the activity log, renders audit entries, and filters by category', async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
});
