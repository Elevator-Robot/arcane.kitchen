export type UserProfile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  needsUsernameSetup: boolean;
  usernameUpdatedAt?: string;
  lastUsernameChange?: number;
  usernameAvailableDate?: string;
};

const USER_PROFILES_STORAGE_KEY = 'arcaneKitchen.userProfiles';

export const sanitizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 20);

export const validateUsername = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized.length >= 3 && normalized.length <= 20 && /^[a-z0-9_]+$/.test(normalized);
};

export const validateDisplayName = (value: string) => {
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 40;
};

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export const isUsernameTaken = (username: string, existingUsernames: string[]) => {
  const normalized = username.trim().toLowerCase();
  return existingUsernames.some(
    (existing) => existing.trim().toLowerCase() === normalized
  );
};

export const isUsernameChangeAllowed = (
  profile: UserProfile,
  desiredUsername: string,
) => {
  const normalized = sanitizeUsername(desiredUsername);
  if (profile.username === normalized) return true;
  // Prefer numeric timestamp `lastUsernameChange` when available
  const lastChangeMs = typeof profile.lastUsernameChange === 'number'
    ? profile.lastUsernameChange
    : profile.usernameUpdatedAt
    ? Date.parse(profile.usernameUpdatedAt)
    : NaN;

  if (!lastChangeMs || Number.isNaN(lastChangeMs)) return true;

  return (
    Date.now() - lastChangeMs >=
    USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );
};

export const validateProfileIdentity = ({
  profiles,
  userId,
  displayName,
  username,
  profile,
}: {
  profiles: Record<string, UserProfile>;
  userId: string;
  displayName: string;
  username: string;
  profile?: UserProfile | null;
}) => {
  const nextName = displayName.trim();
  const nextUsername = sanitizeUsername(username);

  if (!validateDisplayName(nextName)) {
    return 'Please add a display name up to 40 characters.';
  }

  if (!validateUsername(nextUsername)) {
    return 'Usernames must be 3-20 characters, lowercase letters, numbers, or underscores only.';
  }

  const existingUsernames = Object.values(profiles)
    .filter((entry) => entry.userId !== userId)
    .map((entry) => entry.username);

  if (isUsernameTaken(nextUsername, existingUsernames) && profile?.username !== nextUsername) {
    return 'That username is already taken. Please choose another.';
  }

  if (
    profile &&
    profile.username !== nextUsername &&
    !isUsernameChangeAllowed(profile, nextUsername)
  ) {
    return 'You can only change your username once every 30 days.';
  }

  return null;
};

export const buildSuggestedUsername = (
  displayName: string,
  existingUsernames: string[] = []
) => {
  const culinaryBases = [
    'the_cook',
    'spice_artisan',
    'kitchen_wizard',
    'pantry_mage',
    'stew_savant',
    'spoon_wielder',
    'seasoned_cook',
    'herb_sage',
    'baker_nomad',
    'simmer_master',
    'flavor_wright',
  ];

  const normalizedExisting = new Set(existingUsernames.map((name) => name.toLowerCase()));

  // Prefer a sanitized display name if it produces a usable handle
  const namePart = sanitizeUsername(displayName).replace(/^cook$/, '');
  if (namePart) {
    const candidate = `${namePart}`.slice(0, 20);
    if (!normalizedExisting.has(candidate)) return candidate;
  }

  // Try base names, then attach a short numeric suffix for uniqueness
  for (const base of culinaryBases) {
    if (!normalizedExisting.has(base)) return base;
  }

  // Generate numeric suffix handles
  let attempt = 0;
  while (attempt < 10000) {
    const base = culinaryBases[attempt % culinaryBases.length];
    const suffix = Math.floor(Math.random() * 9000) + 100; // 100-9099
    const candidate = `${base}_${suffix}`.slice(0, 20);
    if (!normalizedExisting.has(candidate)) return candidate;
    attempt += 1;
  }

  // Fallback deterministic handle
  return `the_cook_${Math.floor(Math.random() * 9000) + 100}`;
};

export const loadUserProfiles = (): Record<string, UserProfile> => {
  if (typeof window === 'undefined') return {};

  try {
    const saved = window.localStorage.getItem(USER_PROFILES_STORAGE_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved) as Record<string, UserProfile>;
    if (!parsed || typeof parsed !== 'object') return {};

    return parsed;
  } catch {
    return {};
  }
};

export const saveUserProfiles = (profiles: Record<string, UserProfile>) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore storage failures
  }
};

export const getDisplayNameFromAuth = (
  currentUser?: { username?: string | null } | null,
  userAttributes?: Record<string, unknown> | null
) => {
  const directName =
    (userAttributes?.name as string | undefined) ||
    (userAttributes?.given_name as string | undefined) ||
    (userAttributes?.preferred_username as string | undefined) ||
    (userAttributes?.nickname as string | undefined) ||
    (currentUser?.username as string | undefined) ||
    '';

  if (directName) return directName;

  const email = (userAttributes?.email as string | undefined) || '';
  return email.split('@')[0] || 'Cook';
};

const isGoogleUser = (userAttributes?: Record<string, unknown> | null) => {
  const identities = userAttributes?.identities;

  if (Array.isArray(identities)) {
    return identities.some((entry) => {
      const provider = (entry as { providerName?: string; provider?: string } | null)?.providerName || (entry as { providerName?: string; provider?: string } | null)?.provider;
      return provider?.toLowerCase() === 'google';
    });
  }

  if (typeof identities === 'string') {
    try {
      const parsed = JSON.parse(identities) as Array<{ providerName?: string; provider?: string }>;
      return parsed.some((entry) => {
        const provider = entry.providerName || entry.provider;
        return provider?.toLowerCase() === 'google';
      });
    } catch {
      return false;
    }
  }

  return false;
};

export const getUsernameFromAuth = (
  currentUser?: { username?: string | null } | null,
  userAttributes?: Record<string, unknown> | null
) => {
  const explicitUsername = (userAttributes?.username as string | undefined) || '';
  if (explicitUsername) return sanitizeUsername(explicitUsername);

  const preferredDisplay =
    (userAttributes?.name as string | undefined) ||
    (userAttributes?.given_name as string | undefined) ||
    (userAttributes?.nickname as string | undefined) ||
    (userAttributes?.preferred_username as string | undefined) ||
    '';

  if (preferredDisplay) return sanitizeUsername(preferredDisplay);

  const email = (userAttributes?.email as string | undefined) || '';
  if (email) return sanitizeUsername(email.split('@')[0] || 'cook');

  return sanitizeUsername((currentUser?.username as string | undefined) || 'cook');
};

export const upsertUserProfile = (
  profiles: Record<string, UserProfile>,
  input: {
    userId: string;
    displayName?: string;
    username?: string;
    bio?: string;
    avatar?: string | null;
    needsUsernameSetup?: boolean;
    currentUser?: { username?: string | null } | null;
    userAttributes?: Record<string, unknown> | null;
  }
): Record<string, UserProfile> => {
  const existing = profiles[input.userId];
  const nextDisplayName = input.displayName || getDisplayNameFromAuth(input.currentUser, input.userAttributes) || existing?.displayName || 'Cook';
  const nextUsername =
    input.username || existing?.username || getUsernameFromAuth(input.currentUser, input.userAttributes) || sanitizeUsername(nextDisplayName);

  const normalizedUsername = sanitizeUsername(nextUsername);
  // Decide whether we should prompt the user to set a username.
  // Avoid prompting repeatedly: only prompt for genuinely new profiles that
  // lack any reasonable username suggestion and when the caller hasn't
  // explicitly requested a prompt. Preserve any existing preference.
  const usernameFromAuth = getUsernameFromAuth(input.currentUser, input.userAttributes);
  const isNewProfile = !existing;
  const shouldPromptForUsername =
    typeof input.needsUsernameSetup === 'boolean'
      ? input.needsUsernameSetup
      : typeof existing?.needsUsernameSetup === 'boolean'
      ? existing.needsUsernameSetup
      : (
        // prompt only for new profiles with no provided username and no
        // meaningful suggested username from auth; do not auto-prompt for
        // Google-authenticated users or when auth suggests a usable name.
        isNewProfile &&
        !input.username &&
        (!usernameFromAuth || usernameFromAuth === 'cook') &&
        !isGoogleUser(input.userAttributes)
      );

  const usernameForProfile = normalizedUsername || existing?.username || 'cook';
  const usernameChanged = Boolean(existing?.username && existing.username !== usernameForProfile);
  const nextUsernameUpdatedAt = usernameChanged || !existing?.username ? new Date().toISOString() : existing?.usernameUpdatedAt;
  const nextLastUsernameChange = usernameChanged || !existing?.username ? Date.now() : existing?.lastUsernameChange;

  const nextProfile: UserProfile = {
    userId: input.userId,
    username: usernameForProfile,
    displayName: nextDisplayName,
    bio: input.bio ?? existing?.bio ?? '',
    avatar: input.avatar ?? existing?.avatar ?? null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    needsUsernameSetup: shouldPromptForUsername,
    usernameUpdatedAt: nextUsernameUpdatedAt,
    lastUsernameChange: nextLastUsernameChange,
  };

  return {
    ...profiles,
    [input.userId]: nextProfile,
  };
};

export const getRecipeRoutePath = (recipeId?: string | null) => {
  if (!recipeId) return '/';
  return `/recipe/${encodeURIComponent(recipeId)}`;
};

export const getProfileRoutePath = (username?: string | null) => {
  if (!username) return '/';
  return `/u/${encodeURIComponent(username)}`;
};

export const getRecipeIdFromPath = (pathname?: string | null) => {
  if (!pathname) return null;

  const [pathOnly, queryString = ''] = pathname.split('?');
  const pathMatch = pathOnly.match(/^\/recipe\/([^/?#]+)$/i);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]);
  }

  const queryValue = new URLSearchParams(queryString).get('recipe');
  return queryValue ? decodeURIComponent(queryValue) : null;
};

export const getProfileUsernameFromPath = (pathname?: string | null) => {
  if (!pathname) return null;

  const match = pathname.match(/^\/(?:u|profile)\/([^/?#]+)$/i);
  if (!match?.[1]) return null;

  return decodeURIComponent(match[1]);
};

export const getProfileShareUrl = (username?: string | null, origin = typeof window !== 'undefined' ? window.location.origin : 'https://arcane.kitchen') => {
  const normalized = sanitizeUsername(username || '');
  if (!normalized) return '';
  return `${origin}${getProfileRoutePath(normalized)}`;
};

export const syncUserProfilesToBackend = async (profiles: Record<string, UserProfile>, client: any) => {
  if (!client?.models?.UserProfile) return;

  try {
    type UserProfileBackendRecord = UserProfile & { id?: string };

    const { data: existingProfiles = [] } = await client.models.UserProfile.list({ authMode: 'userPool' });
    const existingByUserId = new Map(
      (existingProfiles as UserProfileBackendRecord[]).map((profile) => [profile.userId, profile])
    );

    for (const [userId, profile] of Object.entries(profiles)) {
      const current = existingByUserId.get(userId) as UserProfileBackendRecord | undefined;
      if (current?.username === profile.username && current?.displayName === profile.displayName && current?.avatar === profile.avatar && current?.bio === profile.bio) {
        continue;
      }

      if (current?.id) {
        await client.models.UserProfile.update(
          {
            id: current.id,
            userId: profile.userId,
            username: profile.username,
            displayName: profile.displayName,
            bio: profile.bio,
            avatar: profile.avatar ?? null,
            needsUsernameSetup: profile.needsUsernameSetup,
          },
          { authMode: 'userPool' }
        );
        continue;
      }

      await client.models.UserProfile.create(
        {
          userId: profile.userId,
          username: profile.username,
          displayName: profile.displayName,
          bio: profile.bio,
          avatar: profile.avatar ?? null,
          needsUsernameSetup: profile.needsUsernameSetup,
        },
        { authMode: 'userPool' }
      );
    }
  } catch {
    // best effort: localStorage remains the source of truth for current-session behavior
  }
};

export const getRouteTargetFromPathname = (pathname?: string | null) => {
  if (!pathname) return null;

  const normalizedPath = pathname || '';
  const profileUsername = getProfileUsernameFromPath(normalizedPath);
  if (profileUsername) {
    return { type: 'profile' as const, username: profileUsername };
  }

  const recipeId = getRecipeIdFromPath(normalizedPath);
  if (recipeId) {
    return { type: 'recipe' as const, recipeId };
  }

  return null;
};

export const findProfileByUsername = (
  profiles: Record<string, UserProfile>,
  username: string
) => {
  const normalized = sanitizeUsername(username);
  return Object.values(profiles).find((profile) => sanitizeUsername(profile.username) === normalized) || null;
};
