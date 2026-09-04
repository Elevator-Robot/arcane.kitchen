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
  return (
    normalized.length >= 3 &&
    normalized.length <= 20 &&
    /^[a-z0-9_]+$/.test(normalized)
  );
};

export const validateDisplayName = (value: string) => {
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 40;
};

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export const isUsernameTaken = (
  username: string,
  existingUsernames: string[]
) => {
  const normalized = username.trim().toLowerCase();
  return existingUsernames.some(
    (existing) => existing.trim().toLowerCase() === normalized
  );
};

export const isUsernameChangeAllowed = (
  profile: UserProfile,
  desiredUsername: string
) => {
  const normalized = sanitizeUsername(desiredUsername);
  if (profile.username === normalized) return true;
  // Prefer numeric timestamp `lastUsernameChange` when available
  const lastChangeMs =
    typeof profile.lastUsernameChange === 'number'
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

  if (
    isUsernameTaken(nextUsername, existingUsernames) &&
    profile?.username !== nextUsername
  ) {
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

  const normalizedExisting = new Set(
    existingUsernames.map((name) => name.toLowerCase())
  );

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
    window.localStorage.setItem(
      USER_PROFILES_STORAGE_KEY,
      JSON.stringify(profiles)
    );
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
      const provider =
        (entry as { providerName?: string; provider?: string } | null)
          ?.providerName ||
        (entry as { providerName?: string; provider?: string } | null)
          ?.provider;
      return provider?.toLowerCase() === 'google';
    });
  }

  if (typeof identities === 'string') {
    try {
      const parsed = JSON.parse(identities) as Array<{
        providerName?: string;
        provider?: string;
      }>;
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
  const explicitUsername =
    (userAttributes?.username as string | undefined) || '';
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

  return sanitizeUsername(
    (currentUser?.username as string | undefined) || 'cook'
  );
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
  // Prefer an explicit value, then a previously saved name, then an
  // auth-derived one. Auth fallbacks can report 'Cook' (getDisplayNameFromAuth)
  // and must never clobber a name the user has already set.
  const nextDisplayName =
    input.displayName ||
    existing?.displayName ||
    getDisplayNameFromAuth(input.currentUser, input.userAttributes) ||
    'Cook';
  const nextUsername =
    input.username ||
    existing?.username ||
    getUsernameFromAuth(input.currentUser, input.userAttributes) ||
    sanitizeUsername(nextDisplayName);

  const normalizedUsername = sanitizeUsername(nextUsername);
  // Decide whether we should prompt the user to set a username.
  // Avoid prompting repeatedly: only prompt for genuinely new profiles that
  // lack any reasonable username suggestion and when the caller hasn't
  // explicitly requested a prompt. Preserve any existing preference.
  const usernameFromAuth = getUsernameFromAuth(
    input.currentUser,
    input.userAttributes
  );
  const isNewProfile = !existing;
  const shouldPromptForUsername =
    typeof input.needsUsernameSetup === 'boolean'
      ? input.needsUsernameSetup
      : typeof existing?.needsUsernameSetup === 'boolean'
        ? existing.needsUsernameSetup
        : // prompt only for new profiles with no provided username and no
          // meaningful suggested username from auth; do not auto-prompt for
          // Google-authenticated users or when auth suggests a usable name.
          isNewProfile &&
          !input.username &&
          (!usernameFromAuth || usernameFromAuth === 'cook') &&
          !isGoogleUser(input.userAttributes);

  const usernameForProfile = normalizedUsername || existing?.username || 'cook';
  const usernameChanged = Boolean(
    existing?.username && existing.username !== usernameForProfile
  );
  const nextUsernameUpdatedAt =
    usernameChanged || !existing?.username
      ? new Date().toISOString()
      : existing?.usernameUpdatedAt;
  const nextLastUsernameChange =
    usernameChanged || !existing?.username
      ? Date.now()
      : existing?.lastUsernameChange;

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

export const getProfileShareUrl = (
  username?: string | null,
  origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://arcane.kitchen'
) => {
  const normalized = sanitizeUsername(username || '');
  if (!normalized) return '';
  return `${origin}${getProfileRoutePath(normalized)}`;
};

export type BackendUserProfileRecord = {
  id?: string;
  userId: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatar?: string | null;
  needsUsernameSetup?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Map a backend UserProfile record into the app's UserProfile shape used by the
 * UI. Backend fields that are optional/nullable are normalized to the local
 * defaults so callers can rely on stable types.
 */
export const userProfileFromBackend = (
  record: BackendUserProfileRecord
): UserProfile => ({
  userId: record.userId,
  username: record.username,
  displayName: record.displayName,
  bio: record.bio ?? '',
  avatar: record.avatar ?? null,
  createdAt: record.createdAt ?? new Date(0).toISOString(),
  updatedAt: record.updatedAt ?? new Date(0).toISOString(),
  needsUsernameSetup: Boolean(record.needsUsernameSetup),
});

export type UserProfileIndex = {
  byUserId: Record<string, UserProfile>;
  byUsername: Record<string, UserProfile>;
};

/**
 * Build userId→profile and username→profile lookup maps from a list of
 * backend profile records. Usernames are keyed by their sanitized form so
 * lookups from routes (/u/:handle) and from Recipe.ownerId both resolve.
 */
export const indexUserProfiles = (
  profiles: UserProfile[]
): UserProfileIndex => {
  const byUserId: Record<string, UserProfile> = {};
  const byUsername: Record<string, UserProfile> = {};

  for (const profile of profiles) {
    if (profile.userId) byUserId[String(profile.userId)] = profile;
    if (profile.username)
      byUsername[sanitizeUsername(profile.username)] = profile;
  }

  return { byUserId, byUsername };
};

const toBackendProfileRecord = (profile: UserProfile) => ({
  userId: profile.userId,
  username: profile.username,
  displayName: profile.displayName,
  bio: profile.bio || undefined,
  avatar: profile.avatar || undefined,
  needsUsernameSetup: profile.needsUsernameSetup,
});

const DEFAULT_AUTH_MODE = 'userPool';

/**
 * Server-side availability check for a username. Uses the backend username
 * index so collisions are detected across all users/devices, not just the
 * profiles cached in the current browser.
 */
export const isUsernameTakenServerSide = async (
  username: string,
  excludeUserId?: string | null,
  client?: any
) => {
  const normalized = sanitizeUsername(username);
  if (!normalized || !client?.models?.UserProfile) return false;

  try {
    const { data = [], errors } = await client.models.UserProfile.list({
      filter: { username: { eq: normalized } },
      authMode: DEFAULT_AUTH_MODE,
    });
    if (errors?.length) return false;
    return data.some(
      (profile: any) => String(profile.userId) !== String(excludeUserId)
    );
  } catch {
    return false;
  }
};

/**
 * Fetch a single public profile by username (handle). Works for guests via the
 * identityPool read role and for authenticated users via userPool.
 */
export const getUserProfileByUsername = async (
  username: string,
  client?: any,
  authMode: 'userPool' | 'identityPool' = DEFAULT_AUTH_MODE
): Promise<UserProfile | null> => {
  const normalized = sanitizeUsername(username);
  if (!normalized || !client?.models?.UserProfile) return null;

  try {
    const { data = [], errors } = await client.models.UserProfile.list({
      filter: { username: { eq: normalized } },
      authMode,
    });
    if (errors?.length) return null;
    const first = data[0];
    return first ? userProfileFromBackend(first) : null;
  } catch {
    return null;
  }
};

/**
 * Fetch all public profiles from the backend. Used to build the author→profile
 * hydration map for the recipe feed. Best-effort: returns [] on any failure so
 * callers can fall back to the local cache.
 */
export const listUserProfilesFromBackend = async (
  client?: any,
  authMode: 'userPool' | 'identityPool' = DEFAULT_AUTH_MODE
): Promise<UserProfile[]> => {
  if (!client?.models?.UserProfile) return [];

  try {
    const { data = [], errors } = await client.models.UserProfile.list({
      authMode,
    });
    if (errors?.length) return [];
    return data.map((record: any) => userProfileFromBackend(record));
  } catch {
    return [];
  }
};

/**
 * Persist profile changes to the backend UserProfile model (best-effort).
 *
 * - Only the profile(s) owned by `ownerUserId` are reconciled, so this helper
 *   can never create or overwrite another user's record.
 * - Username changes must delete + recreate the row because `username` is a GSI
 *   key and cannot be updated in place by DynamoDB.
 * - A server-side availability check rejects a handle that another user has
 *   already claimed (the local-only check remains for instant UX feedback).
 *
 * localStorage stays a cache/fallback for the current session; the backend is
 * the source of truth for public profiles.
 */
export const syncUserProfilesToBackend = async (
  profiles: Record<string, UserProfile>,
  client: any,
  ownerUserId?: string | null
) => {
  if (!client?.models?.UserProfile || !client?.models?.UserProfile.list) return;

  const entries = ownerUserId
    ? Object.entries(profiles).filter(
        ([userId]) => String(userId) === String(ownerUserId)
      )
    : Object.entries(profiles);

  for (const [userId, profile] of entries) {
    if (!userId || !profile.username) continue;

    try {
      const existingResult = await client.models.UserProfile.list({
        filter: { userId: { eq: userId } },
        authMode: DEFAULT_AUTH_MODE,
      });
      const existing = existingResult?.data?.[0];

      if (existing?.id) {
        if (existing.username !== profile.username) {
          // Rename: delete the row (its id is the username GSI key owner) and
          // create a fresh one with the new handle.
          await client.models.UserProfile.delete(
            { id: existing.id },
            { authMode: DEFAULT_AUTH_MODE }
          );
          if (
            await isUsernameTakenServerSide(profile.username, userId, client)
          ) {
            continue;
          }
          await client.models.UserProfile.create(
            toBackendProfileRecord(profile),
            { authMode: DEFAULT_AUTH_MODE }
          );
          continue;
        }

        await client.models.UserProfile.update(
          {
            id: existing.id,
            ...toBackendProfileRecord(profile),
          },
          { authMode: DEFAULT_AUTH_MODE }
        );
        continue;
      }

      if (await isUsernameTakenServerSide(profile.username, userId, client)) {
        continue;
      }

      await client.models.UserProfile.create(toBackendProfileRecord(profile), {
        authMode: DEFAULT_AUTH_MODE,
      });
    } catch {
      // best effort: the local cache + Cognito mirrors keep the session working
    }
  }
};

/**
 * Reconcile the signed-in user's local profile with the backend. DynamoDB is
 * authoritative when a row exists; Cognito is only used to seed a missing row.
 */
export const reconcileUserProfileOnLogin = async (
  currentUser: { userId?: string | null; username?: string | null } | null,
  userAttributes: Record<string, unknown> | null,
  client?: any
) => {
  const userId = currentUser?.userId || userAttributes?.sub;
  if (!userId || !client?.models?.UserProfile?.list) return;

  const result = await client.models.UserProfile.list({
    filter: { userId: { eq: String(userId) } },
    authMode: DEFAULT_AUTH_MODE,
  });
  if (result.errors?.length) return;

  const backendProfile = result.data?.[0];
  const profiles = loadUserProfiles();
  if (backendProfile) {
    saveUserProfiles({
      ...profiles,
      [String(userId)]: userProfileFromBackend(backendProfile),
    });
    return;
  }

  const seededProfile = upsertUserProfile(profiles, {
    userId: String(userId),
    currentUser,
    userAttributes,
  })[String(userId)];
  if (!seededProfile) return;

  const nextProfiles = { ...profiles, [String(userId)]: seededProfile };
  saveUserProfiles(nextProfiles);
  await syncUserProfilesToBackend(nextProfiles, client, String(userId));
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
  return (
    Object.values(profiles).find(
      (profile) => sanitizeUsername(profile.username) === normalized
    ) || null
  );
};
