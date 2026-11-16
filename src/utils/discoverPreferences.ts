import { MERLIN_PALETTE } from '../theme/merlinPalette';
import { sanitizeUsername } from './userProfiles';

type Preferences = {
  query: string;
  sort: 'asc' | 'desc';
  author: string | null;
  tags: [string, string][];
};
const KEY = 'arcaneKitchen.discoverPreferences';

export function loadDiscoverPreferences(): Preferences {
  const empty: Preferences = {
    query: '',
    sort: 'desc',
    author: null,
    tags: [],
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return empty;
    const colors: readonly string[] = MERLIN_PALETTE;
    const tags: [string, string][] = Array.isArray(saved.tags)
      ? saved.tags.flatMap((entry: unknown) => {
          if (
            !Array.isArray(entry) ||
            typeof entry[0] !== 'string' ||
            !entry[0].trim()
          )
            return [];
          return [
            [
              entry[0].trim().toLowerCase(),
              colors.includes(entry[1]) ? entry[1] : MERLIN_PALETTE[0],
            ],
          ];
        })
      : [];
    return {
      query: typeof saved.query === 'string' ? saved.query : '',
      sort: saved.sort === 'asc' ? 'asc' : 'desc',
      author:
        typeof saved.author === 'string'
          ? sanitizeUsername(saved.author) || null
          : null,
      tags,
    };
  } catch {
    return empty;
  }
}

export function saveDiscoverPreferences(preferences: Preferences) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    /* Filtering still works when tab storage is unavailable. */
  }
}
