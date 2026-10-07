import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  Compass,
  Feather,
  WandSparkles,
  X,
} from 'lucide-react';
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
  onCustomize,
  compact = false,
}: {
  identity: KitchenIdentity;
  username: string;
  onCustomize?: () => void;
  compact?: boolean;
}) {
  const theme = kitchenTheme(identity.theme);
  const calling = kitchenCalling(identity.calling);
  const hasArtwork = Boolean(SANCTUARY_ARTWORK[calling.id]);
  return (
    <div
      className={`relative isolate overflow-hidden text-white ${compact ? 'rounded-2xl px-5 py-6' : 'px-5 py-7 sm:px-8 sm:py-9'}`}
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
        <div className="relative flex justify-end">
          <Button
            variant="banner"
            size="none"
            type="button"
            onClick={onCustomize}
          >
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
            Customize profile
          </Button>
        </div>
      )}
      <div className={`relative min-w-0 ${compact ? 'mt-4' : 'mt-7'}`}>
        <h1
          className={`ak-banner-title truncate whitespace-nowrap leading-tight ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}
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
}: {
  identity: KitchenIdentity;
  isOwnProfile: boolean;
}) {
  const familiar = kitchenFamiliar(identity.familiar);
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-border)] md:grid-cols-3">
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          Kitchen familiar
        </h2>
        <FamiliarArtwork
          familiarId={familiar.id}
          pictureClassName="mt-4 block overflow-hidden rounded-2xl"
          imageClassName="aspect-[3/2] w-full object-cover"
        />
        <p className="mt-4 font-heading text-lg">{familiar.name}</p>
        <p className="mt-3 text-xs leading-6 text-[var(--theme-text-muted)]">
          {familiar.note}
        </p>
      </section>
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          Main quest
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
  onClose,
  onSave,
}: {
  user: User;
  recipes: Recipe[];
  onClose: () => void;
  onSave: (identity: KitchenIdentity) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() =>
    normalizeKitchenIdentity(user.kitchenIdentity)
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const initial = normalizeKitchenIdentity(user.kitchenIdentity);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
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
      await onSave(normalizeKitchenIdentity(draft));
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
      label="Customize profile"
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] p-5 sm:px-8 sm:py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">
              Profile settings
            </p>
            <h2 className="mt-1 text-2xl">Customize profile</h2>
            <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
              Choose your birthsign, sanctuary, and familiar. These details
              appear on your public profile.
            </p>
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
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_280px]">
          <fieldset disabled={pending} className="min-w-0 space-y-7">
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
            <fieldset>
              <legend className="text-sm font-bold">Familiar</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {KITCHEN_FAMILIARS.map((familiar) => (
                  <Button
                    variant="image"
                    size="none"
                    key={familiar.id}
                    type="button"
                    aria-label={familiar.name}
                    aria-pressed={draft.familiar === familiar.id}
                    onClick={() => setField('familiar', familiar.id)}
                    className="ak-identity-art-card relative block aspect-[3/2] overflow-hidden rounded-xl text-left"
                  >
                    <FamiliarArtwork
                      familiarId={familiar.id}
                      pictureClassName="block h-full w-full"
                      imageClassName="h-full w-full object-cover"
                    />
                    {draft.familiar === familiar.id && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                    <span className="ak-identity-art-label absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-black/30 px-3 pb-2 pt-5 text-xs font-semibold text-white">
                      {familiar.name}
                    </span>
                  </Button>
                ))}
              </div>
            </fieldset>
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
            <label className="grid gap-2">
              <span className="text-sm font-bold">Side quest</span>
              <textarea
                aria-label="Side quest"
                value={draft.sideQuest}
                onChange={(event) => setField('sideQuest', event.target.value)}
                maxLength={140}
                rows={2}
                placeholder="Learn what grows beneath the winter orchard."
                className="ak-input min-w-0 resize-y rounded-xl px-3 py-3 text-sm"
              />
              <span className="text-right text-xs text-[var(--theme-text-muted)]">
                {draft.sideQuest.length}/140
              </span>
            </label>
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
          </fieldset>
          <aside className="min-w-0 self-start lg:sticky lg:top-0">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
              Live preview
            </p>
            <img
              src={BIRTHSIGN_ARTWORK[kitchenTheme(draft.theme).id]}
              alt={`${kitchenTheme(draft.theme).name} birthsign`}
              width={1536}
              height={1024}
              className="mb-3 aspect-[3/2] w-full rounded-2xl object-contain"
            />
            <SanctuaryBanner identity={draft} username={user.handle} compact />
            <div className="mt-3 rounded-2xl border border-[var(--theme-border)] p-4">
              <p className="break-words font-heading text-xl">{user.name}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                {user.bio || 'Add a little lore about your kitchen.'}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--theme-accent)]">
                {kitchenCalling(draft.calling).name}
              </p>
              <div className="relative mt-4 overflow-hidden rounded-xl">
                <FamiliarArtwork
                  familiarId={kitchenFamiliar(draft.familiar).id}
                  pictureClassName="block"
                  imageClassName="aspect-[3/2] w-full object-cover"
                />
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-3 pb-2 pt-8 text-sm font-semibold text-white">
                  {kitchenFamiliar(draft.familiar).name}
                </p>
              </div>
            </div>
          </aside>
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
                setDraft(normalizeKitchenIdentity(DEFAULT_KITCHEN_IDENTITY))
              }
              className="rounded-lg text-xs"
            >
              Reset choices
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
