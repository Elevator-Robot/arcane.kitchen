import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_KITCHEN_IDENTITY,
  normalizeKitchenIdentity,
} from '../kitchenIdentity';
import {
  saveKitchenIdentityToBackend,
  upsertUserProfile,
  userProfileFromBackend,
  type UserProfile,
} from '../userProfiles';

const profile: UserProfile = {
  userId: 'cook-1',
  username: 'moon_cook',
  displayName: 'Moon cook',
  avatar: null,
  bio: '',
  needsUsernameSetup: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('kitchen identity persistence', () => {
  it('normalizes old, malformed, and oversized profile values safely', () => {
    expect(normalizeKitchenIdentity(undefined)).toEqual(
      DEFAULT_KITCHEN_IDENTITY
    );
    expect(normalizeKitchenIdentity('{bad')).toEqual(DEFAULT_KITCHEN_IDENTITY);
    const normalized = normalizeKitchenIdentity({
      theme: 'invalid',
      calling: 'invalid',
      familiar: 'invalid',
      motto: 'x'.repeat(100),
      quest: 'x'.repeat(200),
      pantry: ['Garlic', 'Garlic', 'Honey', 'Rosemary', 'Lemon', 'invalid'],
    });
    expect(normalized.theme).toBe('moonlit');
    expect(normalized.motto).toHaveLength(80);
    expect(normalized.quest).toHaveLength(140);
    expect(normalized.pantry).toEqual(['Garlic', 'Honey', 'Rosemary']);
  });

  it('preserves customization through backend hydration and unrelated profile edits', () => {
    const identity = {
      ...DEFAULT_KITCHEN_IDENTITY,
      theme: 'grove',
      pantry: ['Honey'],
    };
    const hydrated = userProfileFromBackend({
      ...profile,
      kitchenIdentity: JSON.stringify(identity),
    });
    expect(hydrated.kitchenIdentity).toEqual(identity);
    expect(
      upsertUserProfile(
        { 'cook-1': hydrated },
        { userId: 'cook-1', bio: 'A little lore' }
      )['cook-1'].kitchenIdentity
    ).toEqual(identity);
  });

  it('updates only customization with owner authentication, including paginated lookups', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ data: [], nextToken: 'next' })
      .mockResolvedValueOnce({ data: [{ ...profile, id: 'profile-row' }] });
    const update = vi.fn().mockResolvedValue({ data: { id: 'profile-row' } });
    const client = { models: { UserProfile: { list, update } } };
    const identity = { ...DEFAULT_KITCHEN_IDENTITY, theme: 'grove' };
    const saved = await saveKitchenIdentityToBackend(profile, identity, client);
    expect(list).toHaveBeenLastCalledWith({
      filter: { userId: { eq: 'cook-1' } },
      authMode: 'userPool',
      nextToken: 'next',
    });
    expect(update).toHaveBeenCalledWith(
      { id: 'profile-row', kitchenIdentity: JSON.stringify(identity) },
      { authMode: 'userPool' }
    );
    expect(saved.kitchenIdentity).toEqual(identity);
  });

  it('rejects failed mutations instead of reporting a successful save', async () => {
    const client = {
      models: {
        UserProfile: {
          list: vi
            .fn()
            .mockResolvedValue({ data: [{ ...profile, id: 'profile-row' }] }),
          update: vi
            .fn()
            .mockResolvedValue({ data: null, errors: [{ message: 'denied' }] }),
        },
      },
    };
    await expect(
      saveKitchenIdentityToBackend(profile, DEFAULT_KITCHEN_IDENTITY, client)
    ).rejects.toThrow('could not be saved');
    expect(profile.kitchenIdentity).toBeUndefined();
  });
});
