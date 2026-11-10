import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import UserProfileView from '../UserProfileView';
import ProfileLink from '../ProfileLink';
import WorkspaceFooter from '../WorkspaceFooter';

const { adminRender } = vi.hoisted(() => ({ adminRender: vi.fn() }));
vi.mock('../AdminDashboard', () => ({
  default: (props: unknown) => {
    adminRender(props);
    return <section aria-label="Backrooms">Admin workspace</section>;
  },
}));

const user = { id: 'cook-1', name: 'Moon Cook', handle: 'moon_cook' };
const recipes = [{ id: 'bread', title: 'Hearth bread', saves: 2 }];

describe('profile-centered navigation', () => {
  beforeEach(() => {
    adminRender.mockClear();
    window.history.replaceState({}, '', '/u/moon_cook');
  });

  it('takes the avatar straight to the profile and exposes support in the footer', async () => {
    window.history.replaceState({}, '', '/discover');
    const interaction = userEvent.setup();
    render(
      <>
        <ProfileLink
          profilePath="/u/moon_cook"
          profileLabel="moon_cook"
          profileAvatar="wanderer.webp"
        />
        <WorkspaceFooter />
      </>
    );
    const profile = screen.getByRole('link', {
      name: 'View your profile, moon_cook',
    });
    await interaction.click(profile);
    expect(window.location.pathname).toBe('/u/moon_cook');
    expect(profile).toHaveAttribute('aria-current', 'page');
    expect(profile).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('contentinfo')).getByRole('link', {
        name: 'Feedback & Support on X',
      })
    ).toHaveAttribute('href', 'https://x.com/ElevatorRobot');
  });

  it('opens Backrooms only when an owner-admin selects it and preserves the saved collection', async () => {
    window.history.replaceState({}, '', '/u/moon_cook?collection=saved');
    const interaction = userEvent.setup();
    const changed = vi.fn();
    render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        savedRecipes={[{ id: 'pie', title: 'Saved pie' }]}
        isAdmin
        onAdminContentChanged={changed}
      />
    );
    expect(adminRender).not.toHaveBeenCalled();
    const navigation = within(
      screen.getByRole('navigation', { name: 'Your profile workspaces' })
    );
    await interaction.click(
      navigation.getByRole('button', { name: 'Backrooms' })
    );
    expect(new URLSearchParams(window.location.search).get('workspace')).toBe(
      'backrooms'
    );
    expect(new URLSearchParams(window.location.search).get('collection')).toBe(
      'saved'
    );
    expect(adminRender).toHaveBeenLastCalledWith(
      expect.objectContaining({
        embedded: true,
        isAdmin: true,
        isAuthenticated: true,
        onContentChanged: changed,
      })
    );
    expect(
      screen.getByRole('button', { name: 'A note from the chef' })
    ).toHaveAttribute('aria-expanded', 'false');
    await interaction.click(navigation.getByRole('button', { name: 'Saved' }));
    expect(window.location.search).toBe('?collection=saved');
    expect(screen.getByText('Saved pie')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Backrooms' })
    ).not.toBeInTheDocument();
  });

  it.each([
    { isOwnProfile: false, isAdmin: true },
    { isOwnProfile: true, isAdmin: false },
  ])(
    'never mounts admin tools for an unauthorized profile view: %o',
    (props) => {
      window.history.replaceState({}, '', '/u/moon_cook?workspace=backrooms');
      render(
        <UserProfileView user={user} publishedRecipes={recipes} {...props} />
      );
      expect(screen.getByText('Hearth bread')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Backrooms' })
      ).not.toBeInTheDocument();
      expect(adminRender).not.toHaveBeenCalled();
    }
  );

  it('keeps logout private and handles pending failures without duplicate requests', async () => {
    let reject!: (reason: Error) => void;
    const signOut = vi.fn(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        })
    );
    const view = render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        isOwnProfile={false}
        onSignOut={signOut}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'Log out' })
    ).not.toBeInTheDocument();
    view.rerender(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        onSignOut={signOut}
      />
    );
    const logout = screen.getByRole('button', { name: 'Log out' });
    fireEvent.click(logout);
    fireEvent.click(logout);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Logging out…' })).toBeDisabled();
    await act(async () => reject(new Error('Private credentials diagnostic')));
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'Private credentials diagnostic'
    );
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled();
  });
});
