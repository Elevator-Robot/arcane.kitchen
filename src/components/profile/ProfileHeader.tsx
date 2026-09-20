import { useState } from 'react';
import { Edit2, Share, MapPin, Calendar, Camera, X, Lock } from 'lucide-react';
import type { User } from '../../types/profile';
import PresetGrid from './PresetGrid';
import {
  getProfileShareUrl,
  loadUserProfiles,
  saveUserProfiles,
  upsertUserProfile,
  sanitizeUsername,
  validateUsername,
  isUsernameChangeAllowed,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from '../../utils/userProfiles';
import { randomMerlinColor } from '../../theme/merlinPalette';

type Props = {
  user: User;
  onShareProfile?: () => void;
  isOwnProfile?: boolean;
  onSelectPreset?: (file: string) => void;
  onProfileUpdated?: (next: {
    handle?: string;
    bio?: string;
  }) => void;
};

export default function ProfileHeader({
  user,
  onShareProfile,
  isOwnProfile = true,
  onSelectPreset,
  onProfileUpdated,
}: Props) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [actionColor] = useState(randomMerlinColor);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [draftHandle, setDraftHandle] = useState(user.handle || '');
  const [draftBio, setDraftBio] = useState(user.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [copied, setCopied] = useState(false);
  const existingProfile = isOwnProfile
    ? loadUserProfiles()[String(user.id || 'current')]
    : null;
  const usernameCooldownMs =
    USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const lastUsernameChange = existingProfile?.lastUsernameChange;
  const usernameChangeLocked = Boolean(
    lastUsernameChange && Date.now() - lastUsernameChange < usernameCooldownMs
  );
  const usernameAvailableDate = lastUsernameChange
    ? new Date(lastUsernameChange + usernameCooldownMs).toLocaleDateString()
    : '';
  const usernameCooldownMessage = usernameAvailableDate
    ? `Username changes are locked until ${usernameAvailableDate}.`
    : '';

  const handleShareProfile = async () => {
    if (typeof window === 'undefined') return;
    const url = getProfileShareUrl(user.handle) || window.location.href;

    if (onShareProfile) {
      onShareProfile();
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: `@${user.handle} on Arcane Kitchen`, url });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Legacy fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6 md:w-auto">
          <div className="relative shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.handle}
                className="h-32 w-32 rounded-full border-4 border-[var(--theme-surface)] object-cover shadow-md sm:h-40 sm:w-40"
              />
            ) : (
              <div
                aria-label={user.handle}
                className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-[var(--theme-surface)] bg-[var(--theme-accent)] text-4xl font-semibold text-white shadow-md sm:h-40 sm:w-40"
              >
                {(user.handle || user.name || 'C').charAt(0).toUpperCase()}
              </div>
            )}
            {isOwnProfile && (
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-2 right-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 shadow transition hover:bg-[var(--theme-surface-alt)]"
                aria-label="update avatar"
              >
                <Camera className="w-4 h-4" style={{ color: actionColor }} />
              </button>
            )}
          </div>

          <div className="min-w-0 w-full text-center sm:text-left">
            <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
              {!isEditingHandle ? (
                <>
                   <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--theme-text)] truncate md:text-3xl">
                     {user.handle}
                  </span>
                  {isOwnProfile && (
                    <span
                      tabIndex={usernameChangeLocked ? 0 : undefined}
                      title={usernameCooldownMessage || undefined}
                      aria-label={usernameCooldownMessage || 'Edit username'}
                    >
                      <button
                        onClick={() => setIsEditingHandle(true)}
                        aria-label="edit username"
                        disabled={usernameChangeLocked}
                        className="rounded-full p-1 text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {usernameChangeLocked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Edit2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </span>
                  )}
                </>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={draftHandle}
                    onChange={(e) => setDraftHandle(e.target.value)}
                    className="ak-input min-w-0 w-full rounded px-3 py-2 sm:w-auto"
                  />
                  <button
                    onClick={() => {
                      const desired = sanitizeUsername(draftHandle);
                      const userId = String(user.id || 'current');
                      const profiles = loadUserProfiles();
                      const existingProfile = profiles[userId];

                      if (!validateUsername(desired)) {
                        window.alert(
                          'Usernames must be 3-20 characters: lowercase letters, numbers, or underscores.'
                        );
                        return;
                      }

                      if (
                        !isUsernameChangeAllowed(
                          existingProfile || ({} as any),
                          desired
                        )
                      ) {
                        window.alert(
                          'You can only change your username once every 30 days.'
                        );
                        return;
                      }

                      const updated = upsertUserProfile(profiles, {
                        userId,
                        username: desired,
                      });
                      saveUserProfiles(updated);
                      setIsEditingHandle(false);
                      setDraftHandle(desired);
                      if (onProfileUpdated)
                        onProfileUpdated({ handle: desired });
                    }}
                    style={{ backgroundColor: actionColor }}
                    className="rounded px-3 py-2 text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingHandle(false);
                      setDraftHandle(user.handle || '');
                    }}
                    className="rounded border border-[var(--theme-border)] px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4">
              {!isEditingBio ? (
                <div>
                  {user.bio ? (
                    <div className="flex items-start justify-center gap-2 text-sm text-[var(--theme-text-muted)] sm:justify-start">
                      <p className="whitespace-pre-wrap">{user.bio}</p>
                      {isOwnProfile && (
                        <button
                          onClick={() => setIsEditingBio(true)}
                          aria-label="edit bio"
                          className="-ml-1 rounded-full p-1 text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--theme-text-muted)] sm:justify-start">
                      <span>No bio added yet. Click to add one.</span>
                      {isOwnProfile && (
                        <button
                          onClick={() => setIsEditingBio(true)}
                          aria-label="edit bio"
                          className="rounded-full p-1 text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-alt)]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    aria-label="bio"
                    className="ak-input w-full rounded px-3 py-2 text-left text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setIsEditingBio(false);
                        setDraftBio(user.bio || '');
                      }}
                     className="rounded border border-[var(--theme-border)] px-3 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const userId = String(user.id || 'current');
                        const profiles = loadUserProfiles();
                        const updated = upsertUserProfile(profiles, {
                          userId,
                          bio: draftBio,
                        });
                        saveUserProfiles(updated);
                        setIsEditingBio(false);
                        if (onProfileUpdated)
                          onProfileUpdated({ bio: draftBio });
                      }}
                      style={{ backgroundColor: actionColor }}
                      className="rounded px-3 py-2 text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[var(--theme-text-muted)] sm:justify-start">
              {user.location && (
                <div className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--theme-text-muted)]" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}
              {user.joinDate && (
                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--theme-text-muted)]" />
                  <span>{formatJoinDate(user.joinDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex w-full justify-center md:mt-0 md:w-auto md:justify-end">
          <div className="flex items-center gap-3 md:flex-col md:items-end">
            <button
              type="button"
              onClick={handleShareProfile}
              aria-label="Share profile"
              title="Share profile"
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]"
            >
              <Share className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-cozy-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Update Profile Picture</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-md text-gray-600 hover:bg-[var(--theme-surface-alt)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4">
              <PresetGrid
                onSelect={(file) => setSelectedPreset(file)}
                selected={selectedPreset}
              />

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAvatarModal(false);
                    setSelectedPreset(null);
                  }}
                  className="rounded border px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedPreset && onSelectPreset) {
                      onSelectPreset(selectedPreset);
                      setShowAvatarModal(false);
                    }
                  }}
                  style={{ backgroundColor: actionColor }}
                  className="rounded px-3 py-1 text-white"
                >
                  Save Picture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatJoinDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
    };
    return `Joined ${d.toLocaleDateString(undefined, opts)}`.replace(',', '');
  } catch {
    return iso;
  }
}
