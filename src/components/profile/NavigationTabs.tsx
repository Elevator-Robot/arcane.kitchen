import { MERLIN_PALETTE } from '../../theme/merlinPalette';
import Button from '../ui/Button';

export type TabKey = 'recipes' | 'saved';

export default function NavigationTabs({
  active,
  recipesCount,
  savedCount,
  onChange,
}: {
  active: TabKey;
  recipesCount: number;
  savedCount: number;
  onChange: (tab: TabKey) => void;
}) {
  const collections = [
    {
      key: 'recipes' as const,
      label: 'Recipes',
      count: recipesCount,
      color: MERLIN_PALETTE[2],
    },
    {
      key: 'saved' as const,
      label: 'Saved',
      count: savedCount,
      color: MERLIN_PALETTE[5],
    },
  ];
  return (
    <nav
      aria-label="Your recipe collections"
      className="mt-6 grid grid-cols-2 border-b border-[var(--theme-border)]"
    >
      {collections.map(({ key, label, count, color }) => (
        <Button
          key={key}
          variant="unstyled"
          size="none"
          aria-label={label}
          aria-describedby={
            key === 'saved' ? 'saved-collection-privacy' : undefined
          }
          aria-pressed={active === key}
          onClick={() => onChange(key)}
          className={`-mb-px inline-flex min-h-12 w-full items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors ${active === key ? 'text-[var(--theme-text)]' : 'border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'}`}
          style={active === key ? { borderBottomColor: color } : undefined}
        >
          <span>{label}</span>
          <span className="rounded-full bg-[var(--theme-surface-alt)] px-2 py-0.5 text-xs font-normal tabular-nums text-[var(--theme-text-muted)]">
            {count}
          </span>
          {key === 'saved' && (
            <span id="saved-collection-privacy" className="sr-only">
              Only you
            </span>
          )}
        </Button>
      ))}
    </nav>
  );
}
