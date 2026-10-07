import { useEffect, useRef, useState } from 'react';
import { Edit2, Calendar, Camera, X, Lock } from 'lucide-react';
import AccessibleDialog from '../AccessibleDialog';
import type { User } from '../../types/profile';
import PresetGrid from './PresetGrid';
import {
  loadUserProfiles,
  saveUserProfiles,
  upsertUserProfile,
  sanitizeUsername,
  validateUsername,
  isUsernameChangeAllowed,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from '../../utils/userProfiles';
import { randomMerlinColor } from '../../theme/merlinPalette';
import { BIRTHSIGN_ARTWORK } from '../../theme/birthsignArtwork';
import {
  kitchenTheme,
  normalizeKitchenIdentity,
} from '../../utils/kitchenIdentity';

const PROFILE_BIO_LIMIT = 500;

type Props = {
  user: User;
  isOwnProfile?: boolean;
  onSelectPreset?: (file: string) => void;
  onEditBirthsign?: () => void;
  onProfileUpdated?: (next: { handle?: string; bio?: string }) => void;
};

export default function ProfileHeader({
  user,
  isOwnProfile = true,
  onSelectPreset,
  onEditBirthsign,
  onProfileUpdated,
}: Props) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [actionColor] = useState(randomMerlinColor);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [draftHandle, setDraftHandle] = useState(user.handle || '');
  const [draftBio, setDraftBio] = useState(user.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    if (!isEditingBio || !bioInputRef.current) return;
    const input = bioInputRef.current;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, [isEditingBio]);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 w-full flex-1 flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-0">
          <div className="relative isolate flex min-h-60 w-full shrink-0 items-center justify-center self-stretch sm:w-64">
            <img
              src={
                BIRTHSIGN_ARTWORK[
                  kitchenTheme(
                    normalizeKitchenIdentity(user.kitchenIdentity).theme
                  ).id
                ]
              }
              alt=""
              aria-hidden="true"
              className="ak-birthsign-backdrop pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            {isOwnProfile && onEditBirthsign && (
              <button
                type="button"
                aria-label="Change birthsign"
                onClick={onEditBirthsign}
                className="ak-artwork-trigger absolute inset-0 rounded-xl"
              >
                <span className="ak-artwork-hint absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--theme-surface)]/90 px-3 py-1 text-xs text-[var(--theme-text)]">
                  Change birthsign
                </span>
              </button>
            )}
            <div className="pointer-events-none relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.handle}
                  loading="lazy"
                  className="pointer-events-none relative h-32 w-32 rounded-full border-4 border-[var(--theme-surface)] object-cover shadow-md sm:h-40 sm:w-40"
                />
              ) : (
                <div
                  aria-label={user.handle}
                  className="pointer-events-none relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-[var(--theme-surface)] bg-[var(--theme-accent)] text-4xl font-semibold text-white shadow-md sm:h-40 sm:w-40"
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
                  className="ak-button-secondary pointer-events-auto absolute bottom-2 right-2 rounded-full p-2.5"
                  aria-label="update avatar"
                >
                  <Camera className="w-4 h-4" style={{ color: actionColor }} />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 w-full text-left">
            <section className="py-1 sm:pl-6 sm:border-l border-[var(--theme-border)]">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <h2 className="font-heading text-xl text-[var(--theme-text)]">
                  A note from the cook
                </h2>
                {isOwnProfile && !isEditingBio && (
                  <button
                    type="button"
                    aria-label="edit bio"
                    className="ak-button-ghost inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                    onClick={() => {
                      setDraftBio(user.bio || '');
                      setIsEditingBio(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </button>
                )}
              </div>
              <div className="mt-3">
                <div className="relative">
                  <p
                    aria-hidden={
                      isEditingBio && isOwnProfile ? true : undefined
                    }
                    className={`ak-bio-text ${isEditingBio && isOwnProfile ? 'invisible' : ''}`}
                  >
                    {(isEditingBio && isOwnProfile ? draftBio : user.bio) ||
                      (isOwnProfile
                        ? 'Add a little lore about your kitchen.'
                        : 'Letting the recipes tell the story.')}
                  </p>
                  {isEditingBio && isOwnProfile && (
                    <textarea
                      ref={bioInputRef}
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      aria-label="bio"
                      maxLength={PROFILE_BIO_LIMIT}
                      placeholder="Add a little lore about your kitchen."
                      className="ak-bio-text absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent outline-none"
                    />
                  )}
                </div>
                {isEditingBio && isOwnProfile && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-3">
                    <span className="text-xs tabular-nums text-[var(--theme-text-muted)]">
                      {draftBio.length}/{PROFILE_BIO_LIMIT}
                    </span>
                    <div className="flex gap-2">
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
          </div>
        </div>
      </div>
      {showAvatarModal && isOwnProfile && (
        <AccessibleDialog
          label="Who are you?"
          onClose={() => setShowAvatarModal(false)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="my-auto w-full max-w-3xl shrink-0 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-cozy-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Who are you?</h3>
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
