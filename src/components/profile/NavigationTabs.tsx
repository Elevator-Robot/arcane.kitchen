import { BookOpen, Heart, Lock } from 'lucide-react';
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
      description: 'From your kitchen',
      count: recipesCount,
      Icon: BookOpen,
      color: MERLIN_PALETTE[2],
    },
    {
      key: 'saved' as const,
      label: 'Saved',
      description: 'For your next meal',
      count: savedCount,
      Icon: Heart,
      color: MERLIN_PALETTE[5],
    },
  ];
  return (
    <nav
      aria-label="Your recipe collections"
      className="mt-8 grid grid-cols-2 gap-3 sm:gap-4"
    >
      {collections.map(({ key, label, description, count, Icon, color }) => (
        <Button
          key={key}
          variant="choice"
          size="none"
          aria-label={label}
          aria-pressed={active === key}
          onClick={() => onChange(key)}
          className="relative flex min-w-0 flex-col items-stretch gap-3 rounded-2xl p-4 text-left sm:p-6"
          style={active === key ? { backgroundColor: color } : undefined}
        >
          <span className="flex items-center justify-between gap-2">
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-2xl font-heading tabular-nums">{count}</span>
          </span>
          <span className="font-heading text-xl sm:text-2xl">{label}</span>
          <span className="text-xs font-normal sm:text-sm">{description}</span>
          {key === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Only you
            </span>
          )}
        </Button>
      ))}
    </nav>
  );
}
