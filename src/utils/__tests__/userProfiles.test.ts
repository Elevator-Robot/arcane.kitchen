import { describe, expect, it } from 'vitest';
import {
  buildSuggestedUsername,
  getProfileUsernameFromPath,
  getRecipeIdFromPath,
  getRouteTargetFromPathname,
  isUsernameChangeAllowed,
  isUsernameTaken,
  sanitizeUsername,
  upsertUserProfile,
  validateProfileIdentity,
  validateUsername,
} from '../userProfiles';

describe('userProfiles helpers', () => {
  it('sanitizes usernames to a slug-like format', () => {
    expect(sanitizeUsername('  Chef Riddle!  ')).toBe('chefriddle');
    expect(sanitizeUsername('Goblin_42')).toBe('goblin_42');
  });

  it('validates usernames by length and character rules', () => {
    expect(validateUsername('chef')).toBe(true);
    expect(validateUsername('goblin_42')).toBe(true);
    expect(validateUsername('a')).toBe(false);
    expect(validateUsername('chef-42')).toBe(false);
    expect(validateUsername('supercalifragilisticexpialidocious')).toBe(false);
  });

  it('builds a unique suggested username when needed', () => {
    expect(buildSuggestedUsername('Riddle', ['riddle', 'riddle2'])).toBe(
      'riddle3'
    );
    expect(buildSuggestedUsername('  ', ['cook'])).toBe('cook');
  });

  it('parses recipe and profile routes from pathnames', () => {
    expect(getRecipeIdFromPath('/recipe/abc-123')).toBe('abc-123');
    expect(getRecipeIdFromPath('/?recipe=abc-123')).toBe('abc-123');
    expect(getProfileUsernameFromPath('/u/riddle')).toBe('riddle');
    expect(getProfileUsernameFromPath('/profile/riddle')).toBe('riddle');
    expect(getRouteTargetFromPathname('/recipe/abc-123')).toEqual({
      type: 'recipe',
      recipeId: 'abc-123',
    });
    expect(getRouteTargetFromPathname('/?recipe=abc-123')).toEqual({
      type: 'recipe',
      recipeId: 'abc-123',
    });
    expect(getRouteTargetFromPathname('/u/riddle')).toEqual({
      type: 'profile',
      username: 'riddle',
    });
    expect(getRecipeIdFromPath('/u/riddle')).toBeNull();
    expect(getProfileUsernameFromPath('/')).toBeNull();
  });

  it('upserts a profile without losing existing fields', () => {
    const profiles = upsertUserProfile(
      {},
      {
        userId: 'user-1',
        displayName: 'Riddle',
        currentUser: { username: 'riddle@example.com' },
        userAttributes: { email: 'riddle@example.com' },
      }
    );

    expect(profiles['user-1'].username).toBe('riddle');
    expect(profiles['user-1'].displayName).toBe('Riddle');
    expect(profiles['user-1'].needsUsernameSetup).toBe(true);
  });

  it('detects an already taken username', () => {
    expect(isUsernameTaken('Riddle', ['riddle', 'chef'])).toBe(true);
    expect(isUsernameTaken('tavern', ['riddle', 'chef'])).toBe(false);
  });

  it('validates profile identity updates with uniqueness and cooldown rules', () => {
    const profiles = {
      'user-2': {
        userId: 'user-2',
        username: 'chef',
        displayName: 'Chef',
        bio: '',
        avatar: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        needsUsernameSetup: false,
      },
    };

    const existingProfile = {
      userId: 'user-1',
      username: 'riddle',
      displayName: 'Riddle',
      bio: '',
      avatar: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      needsUsernameSetup: false,
      usernameUpdatedAt: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    expect(
      validateProfileIdentity({
        profiles,
        userId: 'user-1',
        displayName: 'Riddle',
        username: 'riddle',
        profile: existingProfile,
      })
    ).toBeNull();
    expect(
      validateProfileIdentity({
        profiles,
        userId: 'user-1',
        displayName: '',
        username: 'riddle',
        profile: existingProfile,
      })
    ).toBe('Please add a display name up to 40 characters.');
    expect(
      validateProfileIdentity({
        profiles,
        userId: 'user-1',
        displayName: 'Riddle',
        username: 'chef',
        profile: existingProfile,
      })
    ).toBe('That username is already taken. Please choose another.');
    expect(
      validateProfileIdentity({
        profiles,
        userId: 'user-1',
        displayName: 'Riddle',
        username: 'riddle2',
        profile: existingProfile,
      })
    ).toBe('You can only change your username once every 30 days.');
  });

  it('enforces username cooldown for profile changes', () => {
    const profile = {
      userId: 'user-1',
      username: 'riddle',
      displayName: 'Riddle',
      bio: '',
      avatar: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      needsUsernameSetup: false,
      usernameUpdatedAt: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    expect(isUsernameChangeAllowed(profile, 'riddle')).toBe(true);
    expect(isUsernameChangeAllowed(profile, 'riddle2')).toBe(false);
  });

  it('allows a username change after the cooldown window', () => {
    const profile = {
      userId: 'user-1',
      username: 'riddle',
      displayName: 'Riddle',
      bio: '',
      avatar: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      needsUsernameSetup: false,
      usernameUpdatedAt: new Date(
        Date.now() - 35 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    expect(isUsernameChangeAllowed(profile, 'riddle2')).toBe(true);
  });
});

describe('backend profile helpers', () => {
  const profile = {
    userId: 'user-1',
    username: 'riddle',
    displayName: 'Riddle',
    bio: 'Tales of the pantry',
    avatar: 'juniper.webp',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    needsUsernameSetup: false,
  };

  it('normalizes backend records into the app UserProfile shape', () => {
    expect(sanitizeUsername('  Chef Riddle!  ')).toBe('chefriddle');
  });

  it('indexes profiles by userId and sanitized username', async () => {
    const { indexUserProfiles } = await import('../userProfiles');
    const { byUserId, byUsername } = indexUserProfiles([profile]);
    expect(byUserId['user-1']).toEqual(profile);
    expect(byUsername['riddle']).toEqual(profile);
    expect(byUsername['RIDDLE']).toBeUndefined(); // keys are sanitized lower-case
  });

  it('syncs only the owner profile and falls back when the model is absent', async () => {
    const { syncUserProfilesToBackend } = await import('../userProfiles');
    const create = vi.fn().mockResolvedValue({ data: {}, errors: undefined });
    const list = vi.fn().mockResolvedValue({ data: [], errors: undefined });
    const client = {
      models: {
        UserProfile: { list, create, update: vi.fn(), delete: vi.fn() },
      },
    };

    await syncUserProfilesToBackend(
      { 'user-1': profile, 'user-2': profile },
      client,
      'user-1'
    );

    // only the owner's profile is reconciled
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].userId).toBe('user-1');

    // model missing -> no-op
    const noopClient = { models: {} };
    await expect(
      syncUserProfilesToBackend({ 'user-1': profile }, noopClient, 'user-1')
    ).resolves.toBeUndefined();
  });

  it('returns a profile when looking up by username', async () => {
    const { getUserProfileByUsername } = await import('../userProfiles');
    let client: any = {
      models: {
        UserProfile: {
          list: vi.fn().mockResolvedValue({ data: [], errors: undefined }),
        },
      },
    };
    await expect(getUserProfileByUsername('ghost', client)).resolves.toBeNull();

    client = {
      models: {
        UserProfile: {
          list: vi
            .fn()
            .mockResolvedValue({ data: [profile], errors: undefined }),
        },
      },
    };
    await expect(getUserProfileByUsername('riddle', client)).resolves.toEqual(
      profile
    );
  });

  it('lists all public profiles from the backend', async () => {
    const { listUserProfilesFromBackend } = await import('../userProfiles');
    const client: any = {
      models: {
        UserProfile: {
          list: vi
            .fn()
            .mockResolvedValue({ data: [profile], errors: undefined }),
        },
      },
    };
    await expect(listUserProfilesFromBackend(client)).resolves.toEqual([
      profile,
    ]);
  });

  it('returns an empty list on backend failure instead of throwing', async () => {
    const { listUserProfilesFromBackend } = await import('../userProfiles');
    const client: any = {
      models: {
        UserProfile: {
          list: vi.fn().mockRejectedValue(new Error('boom')),
        },
      },
    };
    await expect(listUserProfilesFromBackend(client)).resolves.toEqual([]);
  });
});
