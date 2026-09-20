import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  Compass,
  Feather,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import type { Recipe, User } from '../../types/profile';
import {
  DEFAULT_KITCHEN_IDENTITY,
  KITCHEN_CLASSES,
  KITCHEN_FAMILIARS,
  KITCHEN_THEMES,
  PANTRY_CHARMS,
  kitchenCalling,
  kitchenFamiliar,
  kitchenTheme,
  normalizeKitchenIdentity,
  type KitchenIdentity,
} from '../../utils/kitchenIdentity';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';
import AccessibleDialog from '../AccessibleDialog';

export function SanctuaryBanner({
  identity,
  onCustomize,
  compact = false,
}: {
  identity: KitchenIdentity;
  onCustomize?: () => void;
  compact?: boolean;
}) {
  const theme = kitchenTheme(identity.theme);
  return (
    <div
      className={`relative isolate overflow-hidden text-white ${compact ? 'rounded-2xl px-5 py-6' : 'px-5 py-7 sm:px-8 sm:py-9'}`}
      style={{ background: theme.background }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-20 h-80 w-80 rounded-full border border-white/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-4 -top-12 h-64 w-64 rounded-full border border-white/15"
        aria-hidden="true"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 240 200"
        className="pointer-events-none absolute right-0 top-0 h-full w-60 opacity-30"
      >
        <path
          d="M30 155 70 65 128 120 188 34 215 143"
          fill="none"
          stroke="white"
          strokeWidth="0.7"
        />
        {[
          [30, 155],
          [70, 65],
          [128, 120],
          [188, 34],
          [215, 143],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="white" />
        ))}
      </svg>
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Kitchen
          sanctuary
        </p>
        {onCustomize && (
          <button
            type="button"
            onClick={onCustomize}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
          >
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
            Customize sanctuary
          </button>
        )}
      </div>
      <div className={`relative max-w-2xl ${compact ? 'mt-4' : 'mt-7'}`}>
        <p
          className={`break-words font-heading leading-tight ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}
        >
          {identity.motto || 'A little magic lives here.'}
        </p>
        <p className="mt-3 flex items-center gap-2 text-xs text-white/80">
          <span aria-hidden="true">{theme.symbol}</span>
          {theme.name}
          <span aria-hidden="true">·</span>
          {compact ? kitchenCalling(identity.calling).name : theme.note}
        </p>
      </div>
    </div>
  );
}

export function SanctuaryDetails({
  identity,
  isOwnProfile,
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
        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--theme-surface-alt)] text-2xl"
          >
            {familiar.symbol}
          </span>
          <p className="font-heading text-lg">{familiar.name}</p>
        </div>
        <p className="mt-3 text-xs leading-6 text-[var(--theme-text-muted)]">
          {familiar.note}
        </p>
      </section>
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          Pantry of curiosities
        </h2>
        {identity.pantry.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {identity.pantry.map((item) => (
              <li
                key={item}
                className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] px-3 py-1.5 text-xs font-semibold"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm leading-6 text-[var(--theme-text-muted)]">
            {isOwnProfile
              ? 'Choose three ingredients that feel like your kind of magic.'
              : 'Still gathering a few favorite ingredients.'}
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--theme-text-muted)]">
          The ingredients this cook keeps coming back to.
        </p>
      </section>
      <section className="bg-[var(--theme-surface)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          Current side quest
        </h2>
        <p className="mt-5 break-words font-heading text-lg leading-7">
          {identity.quest || 'Following the next delicious idea.'}
        </p>
        <p className="mt-3 text-xs text-[var(--theme-text-muted)]">
          A small adventure, one recipe at a time.
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
      <button
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
            A taste of what makes this kitchen its own.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-accent)]">
            Open recipe
            <ArrowUpRight
              className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </button>
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
          'Your sanctuary could not be saved. Your choices are still here — please try again.'
        )
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AccessibleDialog
      label="Customize your kitchen sanctuary"
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
              Make yourself at home
            </p>
            <h2 className="mt-1 text-2xl">Your kitchen. Your kind of magic.</h2>
            <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
              Build a little world around what you love to cook. These details
              are public.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close customization"
            className="rounded-full p-2 hover:bg-[var(--theme-surface-alt)] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_280px]">
          <fieldset disabled={pending} className="min-w-0 space-y-7">
            <fieldset>
              <legend className="text-sm font-bold">
                1. Set the atmosphere
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {KITCHEN_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={draft.theme === theme.id}
                    onClick={() => setField('theme', theme.id)}
                    className="overflow-hidden rounded-xl border border-[var(--theme-border)] text-left focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
                  >
                    <span
                      className="flex h-16 items-center justify-between px-4 text-3xl text-white"
                      style={{ background: theme.background }}
                    >
                      <span aria-hidden="true">{theme.symbol}</span>
                      {draft.theme === theme.id && (
                        <Check className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="block px-3 py-2 text-xs font-semibold">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-bold">
                2. Choose your culinary calling
              </legend>
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                A little roleplay, never a rank. Change it whenever you like.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {KITCHEN_CLASSES.map((calling) => (
                  <button
                    type="button"
                    key={calling.id}
                    aria-pressed={draft.calling === calling.id}
                    onClick={() => setField('calling', calling.id)}
                    className={`rounded-xl border p-3 text-left text-sm transition ${draft.calling === calling.id ? 'border-[var(--theme-accent)] bg-[var(--theme-focus)]' : 'border-[var(--theme-border)] hover:bg-[var(--theme-surface-alt)]'}`}
                  >
                    <span aria-hidden="true" className="mr-2">
                      {calling.icon}
                    </span>
                    {calling.name}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-bold">
                3. Meet your familiar
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {KITCHEN_FAMILIARS.map((familiar) => (
                  <button
                    key={familiar.id}
                    type="button"
                    aria-pressed={draft.familiar === familiar.id}
                    onClick={() => setField('familiar', familiar.id)}
                    className={`rounded-xl border p-3 text-center transition ${draft.familiar === familiar.id ? 'border-[var(--theme-accent)] bg-[var(--theme-focus)]' : 'border-[var(--theme-border)] hover:bg-[var(--theme-surface-alt)]'}`}
                  >
                    <span className="block text-2xl" aria-hidden="true">
                      {familiar.symbol}
                    </span>
                    <span className="mt-2 block text-xs">{familiar.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Your kitchen motto</span>
              <input
                aria-label="Your kitchen motto"
                value={draft.motto}
                onChange={(event) => setField('motto', event.target.value)}
                maxLength={80}
                placeholder="A pinch of mischief, a spoonful of comfort."
                className="ak-input min-w-0 rounded-xl px-3 py-3 text-sm"
              />
              <span className="text-right text-xs text-[var(--theme-text-muted)]">
                {draft.motto.length}/80
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Current cooking quest</span>
              <textarea
                aria-label="Current cooking quest"
                value={draft.quest}
                onChange={(event) => setField('quest', event.target.value)}
                maxLength={140}
                rows={2}
                placeholder="On a quest for the perfect mushroom ramen…"
                className="ak-input min-w-0 resize-y rounded-xl px-3 py-3 text-sm"
              />
              <span className="text-right text-xs text-[var(--theme-text-muted)]">
                {draft.quest.length}/140
              </span>
            </label>
            <fieldset>
              <legend className="text-sm font-bold">
                Stock your pantry of curiosities{' '}
                <span className="font-normal text-[var(--theme-text-muted)]">
                  ({draft.pantry.length}/3)
                </span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {PANTRY_CHARMS.map((item) => (
                  <label
                    key={item}
                    className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold focus-within:ring-2 focus-within:ring-[var(--theme-accent)] ${draft.pantry.includes(item) ? 'border-[var(--theme-accent)] bg-[var(--theme-focus)]' : 'border-[var(--theme-border)]'}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={draft.pantry.includes(item)}
                      disabled={
                        !draft.pantry.includes(item) && draft.pantry.length >= 3
                      }
                      onChange={(event) =>
                        setField(
                          'pantry',
                          event.target.checked
                            ? [...draft.pantry, item]
                            : draft.pantry.filter((entry) => entry !== item)
                        )
                      }
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
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
            <SanctuaryBanner identity={draft} compact />
            <div className="mt-3 rounded-2xl border border-[var(--theme-border)] p-4">
              <p className="break-words font-heading text-xl">{user.handle}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--theme-accent)]">
                {kitchenCalling(draft.calling).name}
              </p>
              <p className="mt-3 text-sm text-[var(--theme-text-muted)]">
                {kitchenCalling(draft.calling).description}
              </p>
              <p className="mt-4 text-sm">
                {kitchenFamiliar(draft.familiar).symbol}{' '}
                {kitchenFamiliar(draft.familiar).name}
              </p>
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
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                setDraft(normalizeKitchenIdentity(DEFAULT_KITCHEN_IDENTITY))
              }
              className="text-xs text-[var(--theme-text-muted)] underline underline-offset-4"
            >
              Reset choices
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className="ak-button-secondary rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !changed}
                className="ak-button-primary rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save sanctuary'}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </AccessibleDialog>
  );
}
