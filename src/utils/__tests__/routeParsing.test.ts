import { describe, expect, it } from 'vitest';
import {
  getProfileUsernameFromPath,
  getRecipeIdFromPath,
} from '../userProfiles';

describe('route parsing resilience', () => {
  it('supports trailing slashes on shared links', () => {
    expect(getProfileUsernameFromPath('/u/cook/')).toBe('cook');
    expect(getProfileUsernameFromPath('/profile/cook/')).toBe('cook');
    expect(getRecipeIdFromPath('/recipe/abc/')).toBe('abc');
  });
  it('does not crash on malformed percent encoding', () => {
    expect(getProfileUsernameFromPath('/u/%E0%A4%A')).toBeNull();
    expect(getRecipeIdFromPath('/recipe/%E0%A4%A')).toBeNull();
  });
  it('decodes recipe query parameters exactly once', () => {
    expect(getRecipeIdFromPath('/discover?recipe=a%25b')).toBe('a%b');
    expect(getRecipeIdFromPath('/saved?recipe=a%2Fb')).toBe('a/b');
  });
});
