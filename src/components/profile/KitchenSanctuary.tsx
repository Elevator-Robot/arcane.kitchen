import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUpRight, Check, Pencil, Compass, Feather, X } from 'lucide-react';
import type { Recipe, User } from '../../types/profile';
import {
  DEFAULT_KITCHEN_IDENTITY,
  KITCHEN_CLASSES,
  KITCHEN_FAMILIARS,
  KITCHEN_THEMES,
  kitchenCalling,
  kitchenFamiliar,
  kitchenTheme,
  normalizeKitchenIdentity,
  type KitchenIdentity,
} from '../../utils/kitchenIdentity';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';
import AccessibleDialog from '../AccessibleDialog';
import SanctuaryMotif from '../ui/SanctuaryMotif';
import Button from '../ui/Button';
import ColorSchemeImage from '../ui/ColorSchemeImage';
import { BIRTHSIGN_ARTWORK } from '../../theme/birthsignArtwork';
import { FAMILIAR_ARTWORK } from '../../theme/familiarArtwork';
import { SANCTUARY_ARTWORK } from '../../theme/sanctuaryArtwork';

type SanctuaryId = (typeof KITCHEN_CLASSES)[number]['id'];
type FamiliarId = (typeof KITCHEN_FAMILIARS)[number]['id'];
export type ProfileEditSection =
  | 'theme'
  | 'calling'
  | 'quest'
  | 'sideQuest'
  | 'signatureRecipeId';
const EDIT_TITLES: Record<ProfileEditSection, string> = {
  theme: 'Choose your birthsign',
  calling: 'Choose your sanctuary',
  quest: 'Edit main quest',
  sideQuest: 'Edit side quest',
  signatureRecipeId: 'Pin a recipe',
};

export function SanctuaryArtwork({
  callingId,
  pictureClassName,
  imageClassName,
}: {
  callingId: SanctuaryId;
  pictureClassName?: string;
  imageClassName?: string;
}) {
  const artwork = SANCTUARY_ARTWORK[callingId];
  if (!artwork) return null;

  return (
    <ColorSchemeImage
      lightSrc={artwork.light}
      darkSrc={artwork.dark}
      width={2172}
      height={724}
      wrapperClassName={pictureClassName}
      imageClassName={imageClassName}
    />
  );
}

function FamiliarArtwork({
  familiarId,
  pictureClassName,
  imageClassName,
}: {
  familiarId: FamiliarId;
  pictureClassName?: string;
  imageClassName?: string;
}) {
  const artwork = FAMILIAR_ARTWORK[familiarId];

  return (
    <ColorSchemeImage
      lightSrc={artwork.light}
      darkSrc={artwork.dark}
      width={1536}
      height={1024}
      wrapperClassName={pictureClassName}
      imageClassName={imageClassName}
    />
  );
}

export function SanctuaryBanner({
  identity,
  username,
  avatarUrl,
  onChangePortrait,
  actions,
  onCustomize,
  compact = false,
}: {
  identity: KitchenIdentity;
  username: string;
  avatarUrl?: string;
  onChangePortrait?: () => void;
  actions?: ReactNode;
  onCustomize?: () => void;
  compact?: boolean;
}) {
  const theme = kitchenTheme(identity.theme);
  const calling = kitchenCalling(identity.calling);
  const hasArtwork = Boolean(SANCTUARY_ARTWORK[calling.id]);
  return (
    <div
      className={`ak-artwork-surface relative isolate overflow-hidden text-white ${compact ? 'rounded-2xl px-5 py-6' : 'px-5 py-7 sm:px-8 sm:py-9'}`}
      style={{ background: theme.background }}
    >
      {hasArtwork ? (
        <>
          <SanctuaryArtwork
            callingId={calling.id}
            pictureClassName="absolute inset-0"
            imageClassName="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/35"
            aria-hidden="true"
          />
        </>
      ) : (
        <SanctuaryMotif />
      )}
      {onCustomize && (
        <button
          type="button"
          onClick={onCustomize}
          aria-label="Change sanctuary"
          className="ak-artwork-trigger absolute inset-0 z-10 rounded-none"
        ></button>
      )}
      {actions && (
        <div className="pointer-events-none relative z-20 flex flex-wrap justify-end gap-2 [&>*]:pointer-events-auto">
          {actions}
        </div>
      )}
      <div
        className={`pointer-events-none relative z-20 flex min-w-0 items-end ${compact ? 'mt-4' : 'mt-7'}`}
      >
        <div className="ak-portrait-medallion ak-artwork-surface relative h-24 w-24 shrink-0 sm:h-32 sm:w-32">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              loading="lazy"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div
              aria-label={username}
              className="flex h-full w-full items-center justify-center rounded-full bg-[var(--theme-accent)] text-4xl text-white"
            >
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <svg
            className="ak-portrait-engraving"
            viewBox="0 0 128 128"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <circle
              cx="64"
              cy="64"
              r="62"
              stroke="currentColor"
              strokeWidth=".7"
            />
            <path
              d="M45 6a61 61 0 0 1 38 0 M122 45a61 61 0 0 1 0 38 M83 122a61 61 0 0 1-38 0 M6 83a61 61 0 0 1 0-38"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          {onChangePortrait && (
            <button
              type="button"
              aria-label="update avatar"
              onClick={onChangePortrait}
              className="ak-artwork-trigger pointer-events-auto absolute inset-0 rounded-full"
            ></button>
          )}
        </div>
        <h1
          className={`ak-banner-title relative z-10 -ml-6 min-w-0 truncate whitespace-nowrap leading-tight [text-shadow:0_2px_8px_rgb(0_0_0_/_90%)] sm:-ml-7 ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}
          title={username}
        >
          {username}
        </h1>
      </div>
    </div>
  );
}

export function SanctuaryDetails({
  identity,
  isOwnProfile,
  onSave,
  onEdit,
}: {
  identity: KitchenIdentity;
  isOwnProfile: boolean;
  onSave?: (identity: KitchenIdentity) => Promise<void>;
  onEdit?: (section: ProfileEditSection) => void;
}) {
  const familiar = kitchenFamiliar(identity.familiar);
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState(identity.familiar);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-border)] md:grid-cols-3">
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          Familiar
        </h2>
        {isOwnProfile && onSave ? (
          <button
            type="button"
            aria-label="Change familiar"
            className="ak-artwork-trigger relative mt-4 block w-full overflow-hidden rounded-2xl"
            onClick={() => {
              setSelected(identity.familiar);
              setError('');
              setChoosing(true);
            }}
          >
            <FamiliarArtwork
              familiarId={familiar.id}
              pictureClassName="block"
              imageClassName="aspect-[3/2] w-full object-cover"
            />
          </button>
        ) : (
          <FamiliarArtwork
            familiarId={familiar.id}
            pictureClassName="mt-4 block overflow-hidden rounded-2xl"
            imageClassName="aspect-[3/2] w-full object-cover"
          />
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-heading text-lg">{familiar.name}</p>
        </div>
        <p className="mt-3 text-xs leading-6 text-[var(--theme-text-muted)]">
          {familiar.note}
        </p>
        {choosing && isOwnProfile && onSave && (
          <AccessibleDialog
            label="Choose your familiar"
            onClose={() => {
              if (!pending) setChoosing(false);
            }}
          >
            <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl">Choose your familiar</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close familiar picker"
                  disabled={pending}
                  onClick={() => setChoosing(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {KITCHEN_FAMILIARS.map((option) => (
                  <Button
                    key={option.id}
                    variant="image"
                    size="none"
                    disabled={pending}
                    aria-label={option.name}
                    aria-pressed={selected === option.id}
                    onClick={() => setSelected(option.id)}
                    className="ak-identity-art-card relative aspect-[3/2] overflow-hidden rounded-xl"
                  >
                    <FamiliarArtwork
                      familiarId={option.id}
                      pictureClassName="h-full w-full"
                      imageClassName="h-full w-full object-cover"
                    />
                    {selected === option.id && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                    <span className="ak-identity-art-label absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-black/30 px-3 pb-2 pt-5 text-sm font-semibold text-white">
                      {option.name}
                    </span>
                  </Button>
                ))}
              </div>
              {error && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setChoosing(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={pending || selected === identity.familiar}
                  isLoading={pending}
                  onClick={async () => {
                    if (pending) return;
                    setPending(true);
                    setError('');
                    try {
                      await onSave({ ...identity, familiar: selected });
                      setChoosing(false);
                    } catch (saveError) {
                      console.error('Failed to save familiar:', saveError);
                      setError(
                        getUserFacingErrorMessage(
                          saveError,
                          'Your familiar could not be saved. Please try again.'
                        )
                      );
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </AccessibleDialog>
        )}
      </section>
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          Main quest
          {isOwnProfile && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit main quest"
              onClick={() => onEdit('quest')}
              className="ml-auto"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </h2>
        <p className="mt-5 break-words font-heading text-lg leading-7">
          {identity.quest || 'Seeking a recipe lost to the ash.'}
        </p>
        <p className="mt-3 text-xs text-[var(--theme-text-muted)]">
          The work that keeps the lamp burning.
        </p>
      </section>
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          Side quest
          {isOwnProfile && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit side quest"
              onClick={() => onEdit('sideQuest')}
              className="ml-auto"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </h2>
        <p className="mt-5 break-words font-heading text-lg leading-7">
          {identity.sideQuest || 'A page left unwritten.'}
        </p>
        <p className="mt-3 text-xs text-[var(--theme-text-muted)]">
          An inquiry kept in the margins.
        </p>
      </section>
    </div>
  );
}

export function SignatureRecipe({
  recipe,
  onOpen,
}: {
  recipe: Recipe;
  onOpen: (id: Recipe['id']) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
      <Button
        variant="unstyled"
        size="none"
        type="button"
        onClick={() => onOpen(recipe.id)}
        className="group grid w-full text-left sm:grid-cols-[220px_1fr]"
      >
        {recipe.image ? (
          <img
            src={recipe.image}
            alt=""
            loading="lazy"
            className="h-44 w-full object-cover sm:h-full sm:min-h-44"
          />
        ) : (
          <div className="grid min-h-36 place-items-center bg-[var(--theme-surface-alt)]">
            <Feather
              className="h-12 w-12 text-[var(--theme-accent)]"
              aria-hidden="true"
            />
          </div>
        )}
        <div className="min-w-0 p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">
            Signature creation · pinned by the cook
          </p>
          <h2 className="mt-3 break-words text-2xl">{recipe.title}</h2>
          <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
            Selected from this cook’s collected work.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-accent)]">
            Open recipe
            <ArrowUpRight
              className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </Button>
    </section>
  );
}

export function CustomizeSanctuary({
  user,
  recipes,
  section,
  onClose,
  onSave,
}: {
  user: User;
  recipes: Recipe[];
  section: ProfileEditSection;
  onClose: () => void;
  onSave: (identity: KitchenIdentity) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() =>
    normalizeKitchenIdentity(user.kitchenIdentity)
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const initial = normalizeKitchenIdentity(user.kitchenIdentity);
  const changed = draft[section] !== initial[section];
  const setField = <K extends keyof KitchenIdentity>(
    key: K,
    value: KitchenIdentity[K]
  ) => setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !changed) return;
    setPending(true);
    setError('');
    try {
      await onSave(
        normalizeKitchenIdentity({ ...initial, [section]: draft[section] })
      );
      onClose();
    } catch (saveError) {
      console.error('Failed to save kitchen sanctuary:', saveError);
      setError(
        getUserFacingErrorMessage(
          saveError,
          'Your profile choices could not be saved. Please try again.'
        )
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AccessibleDialog
      label={EDIT_TITLES[section]}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] p-5 sm:px-8 sm:py-6">
          <div>
            <h2 className="text-2xl">{EDIT_TITLES[section]}</h2>
          </div>
          <Button
            variant="secondary"
            size="icon"
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close customization"
            className="rounded-full disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>
        <div className="p-5 sm:p-8">
          <fieldset disabled={pending} className="min-w-0 space-y-7">
            {section === 'theme' && (
              <fieldset>
                <legend className="text-sm font-bold">Birthsign</legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {KITCHEN_THEMES.map((theme) => (
                    <Button
                      variant="image"
                      size="none"
                      key={theme.id}
                      type="button"
                      aria-label={theme.name}
                      aria-pressed={draft.theme === theme.id}
                      onClick={() => setField('theme', theme.id)}
                      className="ak-identity-art-card relative block aspect-[3/2] overflow-hidden rounded-xl text-left"
                    >
                      <img
                        src={BIRTHSIGN_ARTWORK[theme.id]}
                        alt=""
                        width={1536}
                        height={1024}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                      {draft.theme === theme.id && (
                        <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                      <span className="ak-identity-art-label absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-black/30 px-2 pb-2 pt-4 text-xs font-semibold text-white">
                        {theme.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
            {section === 'calling' && (
              <fieldset>
                <legend className="text-sm font-bold">Sanctuary</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {KITCHEN_CLASSES.map((calling) => (
                    <Button
                      variant="image"
                      size="none"
                      type="button"
                      key={calling.id}
                      aria-label={calling.name}
                      aria-pressed={draft.calling === calling.id}
                      onClick={() => setField('calling', calling.id)}
                      className="ak-identity-art-card relative block aspect-[3/1] overflow-hidden rounded-xl text-left"
                    >
                      {SANCTUARY_ARTWORK[calling.id] ? (
                        <SanctuaryArtwork
                          callingId={calling.id}
                          pictureClassName="block h-full w-full"
                          imageClassName="h-full w-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid h-full w-full place-items-center bg-[var(--theme-surface-alt)] text-3xl text-[var(--theme-accent)]"
                        >
                          {calling.icon}
                        </span>
                      )}
                      {draft.calling === calling.id && (
                        <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                      <span className="ak-identity-art-label absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-black/30 px-3 pb-2 pt-5 text-xs font-semibold text-white">
                        {calling.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
            {section === 'quest' && (
              <label className="grid gap-2">
                <span className="text-sm font-bold">Main quest</span>
                <textarea
                  aria-label="Main quest"
                  value={draft.quest}
                  onChange={(event) => setField('quest', event.target.value)}
                  maxLength={140}
                  rows={2}
                  placeholder="Recover the broth recipe from the abbey’s missing folio."
                  className="ak-input min-w-0 resize-y rounded-xl px-3 py-3 text-sm"
                />
                <span className="text-right text-xs text-[var(--theme-text-muted)]">
                  {draft.quest.length}/140
                </span>
              </label>
            )}
            {section === 'sideQuest' && (
              <label className="grid gap-2">
                <span className="text-sm font-bold">Side quest</span>
                <textarea
                  aria-label="Side quest"
                  value={draft.sideQuest}
                  onChange={(event) =>
                    setField('sideQuest', event.target.value)
                  }
                  maxLength={140}
                  rows={2}
                  placeholder="Learn what grows beneath the winter orchard."
                  className="ak-input min-w-0 resize-y rounded-xl px-3 py-3 text-sm"
                />
                <span className="text-right text-xs text-[var(--theme-text-muted)]">
                  {draft.sideQuest.length}/140
                </span>
              </label>
            )}
            {section === 'signatureRecipeId' && (
              <label className="grid gap-2">
                <span className="text-sm font-bold">
                  Pin a signature creation
                </span>
                <select
                  aria-label="Pin a signature creation"
                  value={
                    recipes.some(
                      (recipe) => String(recipe.id) === draft.signatureRecipeId
                    )
                      ? draft.signatureRecipeId
                      : ''
                  }
                  onChange={(event) =>
                    setField('signatureRecipeId', event.target.value)
                  }
                  className="ak-input w-full min-w-0 rounded-xl px-3 py-3 text-sm"
                >
                  <option value="">No pinned recipe</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={String(recipe.id)}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[var(--theme-text-muted)]">
                  {recipes.length
                    ? 'Choose one of your published recipes to welcome visitors.'
                    : 'Publish your first recipe to give it pride of place here.'}
                </span>
              </label>
            )}
          </fieldset>
        </div>
        <footer className="sticky bottom-0 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:px-8">
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={pending}
              onClick={() =>
                setDraft({
                  ...draft,
                  [section]: DEFAULT_KITCHEN_IDENTITY[section],
                })
              }
              className="rounded-lg text-xs"
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                disabled={pending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={pending}
                disabled={pending || !changed}
              >
                {pending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </AccessibleDialog>
  );
}
