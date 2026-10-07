import { useState } from 'react';
import { Edit2, Share, Calendar, Camera, X, Lock } from 'lucide-react';
import AccessibleDialog from '../AccessibleDialog';
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
  onProfileUpdated?: (next: { handle?: string; bio?: string }) => void;
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
        await navigator.share({
          title: `@${user.handle} on Arcane Kitchen`,
          url,
        });
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
                loading="lazy"
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
                onClick={() => {
                  setSelectedPreset(null);
                  setShowAvatarModal(true);
                }}
                className="ak-button-secondary absolute bottom-2 right-2 rounded-full p-2.5"
                aria-label="update avatar"
              >
                <Camera className="w-4 h-4" style={{ color: actionColor }} />
              </button>
            )}
          </div>

          <div className="min-w-0 w-full text-left">
            <section className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] p-5 pl-6">
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1 bg-[var(--theme-accent)]"
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">
                About this cook
              </p>
              <h2 className="mt-2 break-words font-heading text-2xl font-semibold tracking-tight text-[var(--theme-text)] md:text-3xl">
                {user.name || user.handle}
              </h2>
              <div className="mt-3">
                {!isEditingBio || !isOwnProfile ? (
                  <div>
                    {user.bio ? (
                      <div className="flex items-start gap-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                        <p className="whitespace-pre-wrap">{user.bio}</p>
                        {isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraftBio(user.bio || '');
                              setIsEditingBio(true);
                            }}
                            aria-label="edit bio"
                            className="ak-button-ghost -ml-1 shrink-0 rounded-full p-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                        <span>
                          {isOwnProfile
                            ? 'Add a little lore about your kitchen.'
                            : 'Letting the recipes tell the story.'}
                        </span>
                        {isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraftBio(user.bio || '');
                              setIsEditingBio(true);
                            }}
                            aria-label="edit bio"
                            className="ak-button-ghost shrink-0 rounded-full p-2"
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
                      maxLength={500}
                      placeholder="Record your craft, the traditions you keep, and the recipes you seek."
                      className="ak-input w-full rounded px-3 py-2 text-left text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingBio(false);
                          setDraftBio(user.bio || '');
                        }}
                        className="ak-button-secondary rounded-xl px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
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
                        className="ak-button-primary rounded-xl px-4 py-2 text-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--theme-text-muted)]">
                {user.joinDate && (
                  <div className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--theme-text-muted)]" />
                    <span>{formatJoinDate(user.joinDate)}</span>
                  </div>
                )}
              </div>
            </section>

            {isEditingHandle && isOwnProfile && (
              <div className="mt-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
                  Change username
                </p>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    aria-label="Username"
                    value={draftHandle}
                    onChange={(e) => setDraftHandle(e.target.value)}
                    className="ak-input min-w-0 w-full rounded px-3 py-2 sm:w-auto"
                  />
                  <button
                    type="button"
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
                    className="ak-button-primary rounded-xl px-4 py-2 text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingHandle(false);
                      setDraftHandle(user.handle || '');
                    }}
                    className="ak-button-secondary rounded-xl px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex w-full justify-center md:mt-0 md:w-auto md:justify-end">
          <div className="flex items-center gap-3 md:flex-col md:items-end">
            {isOwnProfile && !isEditingHandle && (
              <span
                tabIndex={usernameChangeLocked ? 0 : undefined}
                title={usernameCooldownMessage || undefined}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDraftHandle(user.handle || '');
                    setIsEditingHandle(true);
                  }}
                  disabled={usernameChangeLocked}
                  className="ak-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm disabled:opacity-50"
                  aria-label="Edit username"
                >
                  {usernameChangeLocked ? (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Edit2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Username
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleShareProfile}
              aria-label="Share profile"
              title="Share profile"
              className="ak-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
            >
              <Share className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>
      {showAvatarModal && isOwnProfile && (
        <AccessibleDialog
          label="Update Profile Picture"
          onClose={() => setShowAvatarModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-cozy-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Update Profile Picture</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                aria-label="Close avatar picker"
                className="ak-button-ghost rounded-full p-2"
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
                  className="ak-button-secondary rounded-xl px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedPreset}
                  onClick={() => {
                    if (selectedPreset && onSelectPreset) {
                      onSelectPreset(selectedPreset);
                      setShowAvatarModal(false);
                    }
                  }}
                  style={{ backgroundColor: actionColor }}
                  className="ak-button-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                >
                  Save Picture
                </button>
              </div>
            </div>
          </div>
        </AccessibleDialog>
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
