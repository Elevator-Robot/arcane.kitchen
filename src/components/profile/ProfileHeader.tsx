import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Calendar, X } from 'lucide-react';
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
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';
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
  showAvatarModal?: boolean;
  onCloseAvatar?: () => void;
  onProfileUpdated?: (next: { handle?: string; bio?: string }) => void;
};

export default function ProfileHeader({
  user,
  isOwnProfile = true,
  onSelectPreset,
  onEditBirthsign,
  showAvatarModal = false,
  onCloseAvatar,
  onProfileUpdated,
}: Props) {
  const [actionColor] = useState(randomMerlinColor);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  useEffect(() => {
    if (showAvatarModal) {
      setSelectedPreset(null);
    }
  }, [showAvatarModal]);
  const [draftHandle, setDraftHandle] = useState(user.handle || '');
  const [identityError, setIdentityError] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const savingIdentityRef = useRef(false);
  useEffect(() => {
    if (showAvatarModal) {
      setDraftHandle(user.handle || '');
      setIdentityError('');
    }
  }, [showAvatarModal, user.handle]);
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
    ? `You can change your name again on ${usernameAvailableDate}.`
    : '';

  const saveIdentity = async (event: FormEvent) => {
    event.preventDefault();
    if (savingIdentityRef.current) return;
    const desired = sanitizeUsername(draftHandle);
    const handleChanged = desired !== user.handle;
    const userId = String(user.id || 'current');
    const profiles = loadUserProfiles();
    if (handleChanged && !validateUsername(desired)) {
      setIdentityError(
        'Names must be 3-20 characters: lowercase letters, numbers, or underscores.'
      );
      return;
    }
    if (
      handleChanged &&
      !isUsernameChangeAllowed(profiles[userId] || ({} as any), desired)
    ) {
      setIdentityError('You can only change your name once every 30 days.');
      return;
    }
    savingIdentityRef.current = true;
    setSavingIdentity(true);
    setIdentityError('');
    try {
      if (selectedPreset && onSelectPreset)
        await onSelectPreset(selectedPreset);
      if (handleChanged && onProfileUpdated) {
        // Re-read after the portrait update so the rename preserves it.
        const updated = upsertUserProfile(loadUserProfiles(), {
          userId,
          username: desired,
        });
        saveUserProfiles(updated);
        await onProfileUpdated({ handle: desired });
      }
      onCloseAvatar?.();
    } catch (error) {
      console.error('Failed to save profile identity:', error);
      setIdentityError(
        getUserFacingErrorMessage(
          error,
          'Your profile could not be saved. Please try again.'
        )
      );
    } finally {
      savingIdentityRef.current = false;
      setSavingIdentity(false);
    }
  };

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
          <div className="ak-artwork-surface relative isolate aspect-[3/2] w-full shrink-0 self-start sm:w-72 lg:w-80">
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
              className="ak-birthsign-soft-edge pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
            {isOwnProfile && onEditBirthsign && (
              <button
                type="button"
                aria-label="Change sign"
                onClick={onEditBirthsign}
                className="ak-artwork-trigger absolute inset-0"
              >
                <span className="ak-artwork-hint absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--theme-surface)]/90 px-3 py-1 text-xs text-[var(--theme-text)]">
                  Change sign
                </span>
              </button>
            )}
          </div>

          <div className="min-w-0 w-full text-left">
            <section className="py-1 sm:pl-6 sm:border-l border-[var(--theme-border)]">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <h2 className="font-heading text-xl text-[var(--theme-text)]">
                  A note from the chef
                </h2>
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
                  {isOwnProfile && !isEditingBio && (
                    <button
                      type="button"
                      aria-label="edit bio"
                      title="Click to edit your note"
                      className="absolute inset-0 w-full cursor-text rounded-sm bg-transparent transition-colors hover:bg-[var(--theme-focus)]"
                      onClick={() => {
                        setDraftBio(user.bio || '');
                        setIsEditingBio(true);
                      }}
                    />
                  )}
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
          </div>
        </div>
      </div>
      {showAvatarModal && isOwnProfile && (
        <AccessibleDialog
          label="Who are you?"
          onClose={() => {
            if (!savingIdentityRef.current) onCloseAvatar?.();
          }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={saveIdentity}
            className="my-auto w-full max-w-3xl shrink-0 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-cozy-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Who are you?</h3>
              <button
                type="button"
                disabled={savingIdentity}
                onClick={() => onCloseAvatar?.()}
                aria-label="Close avatar picker"
                className="ak-button-ghost rounded-full p-2"
              >
                <X size={16} />
              </button>
            </div>

            <fieldset disabled={savingIdentity} className="mt-4 min-w-0">
              <PresetGrid
                onSelect={(file) => setSelectedPreset(file)}
                selected={selectedPreset}
              />
              <div className="mt-6 pt-5">
                <label className="grid gap-3 text-sm font-semibold">
                  Name
                  <input
                    aria-label="Name"
                    value={draftHandle}
                    onChange={(event) => {
                      setDraftHandle(event.target.value);
                      setIdentityError('');
                    }}
                    disabled={usernameChangeLocked || !onProfileUpdated}
                    maxLength={20}
                    autoComplete="username"
                    spellCheck={false}
                    aria-describedby="identity-name-help"
                    className="ak-identity-name"
                  />
                  <span
                    id="identity-name-help"
                    className="text-xs font-normal text-[var(--theme-text-muted)]"
                  >
                    {usernameChangeLocked
                      ? usernameCooldownMessage
                      : '3–20 letters, numbers, or underscores. You can change your name once every 30 days.'}
                  </span>
                </label>
              </div>

              {identityError && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {identityError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onCloseAvatar?.();
                    setSelectedPreset(null);
                  }}
                  className="ak-button-secondary rounded-xl px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingIdentity ||
                    (!selectedPreset &&
                      sanitizeUsername(draftHandle) === user.handle)
                  }
                  style={{ backgroundColor: actionColor }}
                  className="ak-button-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                >
                  {savingIdentity ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </fieldset>
          </form>
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
