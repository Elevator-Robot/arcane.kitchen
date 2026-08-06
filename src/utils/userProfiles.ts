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
  if (!profile.usernameUpdatedAt) return true;

  const lastUpdateMs = Date.parse(profile.usernameUpdatedAt);
  if (Number.isNaN(lastUpdateMs)) return true;

  return (
    Date.now() - lastUpdateMs >=
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
  const base = sanitizeUsername(displayName) || 'cook';
  const normalizedExisting = new Set(existingUsernames.map((name) => name.toLowerCase()));

  if (!base || base === 'cook' && !sanitizeUsername(displayName)) {
    return 'cook';
  }

  if (!normalizedExisting.has(base)) return base;

  let suffix = 2;
  while (normalizedExisting.has(`${base}${suffix}`)) {
    suffix += 1;
  }

  return `${base}${suffix}`;
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
  const shouldPromptForUsername =
    input.needsUsernameSetup ??
    existing?.needsUsernameSetup ??
    ((!existing?.username && !input.username) || isGoogleUser(input.userAttributes));

  const usernameForProfile =
    normalizedUsername || existing?.username || 'cook';
  const usernameChanged = existing?.username && existing.username !== usernameForProfile;
  const nextUsernameUpdatedAt =
    usernameChanged || !existing?.username
      ? new Date().toISOString()
      : existing.usernameUpdatedAt;

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
