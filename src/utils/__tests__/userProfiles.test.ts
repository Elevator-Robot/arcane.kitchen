import { describe, expect, it } from 'vitest';
import {
  buildSuggestedUsername,
  getProfileUsernameFromPath,
  getRecipeIdFromPath,
  getRouteTargetFromPathname,
  sanitizeUsername,
  validateUsername,
  upsertUserProfile,
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
    expect(buildSuggestedUsername('Riddle', ['riddle', 'riddle2'])).toBe('riddle3');
    expect(buildSuggestedUsername('  ', ['cook'])).toBe('cook');
  });

  it('parses recipe and profile routes from pathnames', () => {
    expect(getRecipeIdFromPath('/recipe/abc-123')).toBe('abc-123');
    expect(getRecipeIdFromPath('/?recipe=abc-123')).toBe('abc-123');
    expect(getProfileUsernameFromPath('/u/riddle')).toBe('riddle');
    expect(getProfileUsernameFromPath('/profile/riddle')).toBe('riddle');
    expect(getRouteTargetFromPathname('/recipe/abc-123')).toEqual({ type: 'recipe', recipeId: 'abc-123' });
    expect(getRouteTargetFromPathname('/?recipe=abc-123')).toEqual({ type: 'recipe', recipeId: 'abc-123' });
    expect(getRouteTargetFromPathname('/u/riddle')).toEqual({ type: 'profile', username: 'riddle' });
    expect(getRecipeIdFromPath('/u/riddle')).toBeNull();
    expect(getProfileUsernameFromPath('/')).toBeNull();
  });

  it('upserts a profile without losing existing fields', () => {
    const profiles = upsertUserProfile({}, {
      userId: 'user-1',
      displayName: 'Riddle',
      currentUser: { username: 'riddle@example.com' },
      userAttributes: { email: 'riddle@example.com' },
    });

    expect(profiles['user-1'].username).toBe('riddle');
    expect(profiles['user-1'].displayName).toBe('Riddle');
    expect(profiles['user-1'].needsUsernameSetup).toBe(true);
  });
});
