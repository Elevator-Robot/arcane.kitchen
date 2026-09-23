import { MERLIN_PALETTE } from '../../theme/merlinPalette';
import Button from '../ui/Button';

export type TabKey = 'recipes' | 'drafts' | 'saved';

type Props = {
  active: TabKey;
  draftsCount?: number;
  savedCount?: number;
  showPrivateTabs?: boolean;
  onChange: (t: TabKey) => void;
};

export default function NavigationTabs({
  active,
  draftsCount = 0,
  savedCount = 0,
  showPrivateTabs = true,
  onChange,
}: Props) {
  const tabColors: Record<TabKey, string> = {
    recipes: MERLIN_PALETTE[2],
    drafts: MERLIN_PALETTE[1],
    saved: MERLIN_PALETTE[5],
  };
  const tabClass = 'rounded-full px-3 py-2.5 text-sm sm:px-5';

  return (
    <nav
      aria-label="Your recipe collections"
      className="border-t border-[var(--theme-border)] px-2 py-3 sm:px-4"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <Button
          variant="choice"
          size="none"
          type="button"
          onClick={() => onChange('recipes')}
          aria-pressed={active === 'recipes'}
          className={tabClass}
          style={
            active === 'recipes'
              ? { backgroundColor: tabColors.recipes }
              : undefined
          }
        >
          <span className="">Recipes</span>
        </Button>

        {showPrivateTabs && (
          <>
            <Button
              variant="choice"
              size="none"
              type="button"
              onClick={() => onChange('drafts')}
              aria-pressed={active === 'drafts'}
              className={tabClass}
              style={
                active === 'drafts'
                  ? { backgroundColor: tabColors.drafts }
                  : undefined
              }
            >
              <span>Drafts</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${active === 'drafts' ? 'bg-white/15 text-white' : 'bg-[var(--theme-surface-alt)] text-[var(--theme-text-muted)]'}`}
              >
                {draftsCount}
              </span>
            </Button>

            <Button
              variant="choice"
              size="none"
              type="button"
              onClick={() => onChange('saved')}
              aria-pressed={active === 'saved'}
              className={tabClass}
              style={
                active === 'saved'
                  ? { backgroundColor: tabColors.saved }
                  : undefined
              }
            >
              <span>Saved</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${active === 'saved' ? 'bg-white/15 text-white' : 'bg-[var(--theme-surface-alt)] text-[var(--theme-text-muted)]'}`}
              >
                {savedCount}
              </span>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
