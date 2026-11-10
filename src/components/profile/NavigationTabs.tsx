import { MERLIN_PALETTE } from '../../theme/merlinPalette';
import Button from '../ui/Button';

export type TabKey = 'recipes' | 'saved' | 'backrooms';

export default function NavigationTabs({
  active,
  recipesCount,
  savedCount,
  showBackrooms = false,
  onChange,
}: {
  active: TabKey;
  recipesCount: number;
  savedCount: number;
  showBackrooms?: boolean;
  onChange: (tab: TabKey) => void;
}) {
  const collections: {
    key: TabKey;
    label: string;
    count?: number;
    color: string;
  }[] = [
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
  if (showBackrooms)
    collections.push({
      key: 'backrooms',
      label: 'Backrooms',
      color: MERLIN_PALETTE[0],
    });
  return (
    <nav
      aria-label={
        showBackrooms ? 'Your profile workspaces' : 'Your recipe collections'
      }
      className={`ak-profile-workspaces mt-6 grid ${showBackrooms ? 'grid-cols-3' : 'grid-cols-2'} border-b border-[var(--theme-border)]`}
    >
      {collections.map(({ key, label, count, color }) => (
        <Button
          key={key}
          variant="unstyled"
          size="none"
          aria-label={label}
          aria-describedby={
            key === 'saved'
              ? 'saved-collection-privacy'
              : key === 'backrooms'
                ? 'backrooms-privacy'
                : undefined
          }
          aria-pressed={active === key}
          onClick={() => onChange(key)}
          className={`-mb-px inline-flex min-h-12 w-full items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors ${active === key ? 'text-[var(--theme-text)]' : 'border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'}`}
          style={active === key ? { borderBottomColor: color } : undefined}
        >
          <span>{label}</span>
          {count !== undefined && (
            <span className="rounded-full bg-[var(--theme-surface-alt)] px-2 py-0.5 text-xs font-normal tabular-nums text-[var(--theme-text-muted)]">
              {count}
            </span>
          )}
          {key === 'saved' && (
            <span id="saved-collection-privacy" className="sr-only">
              Only you
            </span>
          )}
          {key === 'backrooms' && (
            <span id="backrooms-privacy" className="sr-only">
              Admin only
            </span>
          )}
        </Button>
      ))}
    </nav>
  );
}
