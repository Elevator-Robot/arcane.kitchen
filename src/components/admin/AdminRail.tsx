import { useState } from 'react';
import {
  ChefHat,
  MessageCircle,
  Users as UsersIcon,
  Flag,
  ScrollText,
} from 'lucide-react';
import { randomMerlinColor } from '../../theme/merlinPalette';
import type { AdminTab } from './types';

export default function AdminRail({
  active,
  counts,
  onSelect,
}: {
  active: AdminTab;
  counts: Partial<Record<AdminTab, number>>;
  onSelect: (tab: AdminTab) => void;
}) {
  const [activeColor, setActiveColor] = useState(randomMerlinColor);
  const items: {
    id: AdminTab;
    label: string;
    icon: typeof ChefHat;
    count?: number;
  }[] = [
    { id: 'recipes', label: 'Recipes', icon: ChefHat, count: counts.recipes },
    {
      id: 'comments',
      label: 'Comments',
      icon: MessageCircle,
      count: counts.comments,
    },
    { id: 'users', label: 'Users', icon: UsersIcon, count: counts.users },
    { id: 'reports', label: 'Reports', icon: Flag, count: 0 },
    { id: 'activity', label: 'Activity log', icon: ScrollText },
  ];

  return (
    <nav
      aria-label="Admin sections"
      className="flex shrink-0 gap-2 md:sticky md:top-20 md:h-fit md:flex-col md:gap-3 md:self-start md:py-2"
    >
      {items.map(({ id, label, icon: Icon, count }) => {
        const isActive = active === id;
        const name =
          id === 'reports'
            ? 'Reports · 0 open'
            : count !== undefined
              ? `${label} · ${count}`
              : label;
        return (
          <button
            key={id}
            type="button"
            aria-label={name}
            aria-pressed={isActive}
            onClick={() => {
              setActiveColor(randomMerlinColor());
              onSelect(id);
            }}
            style={
              isActive
                ? { backgroundColor: activeColor, borderColor: activeColor }
                : undefined
            }
            className={`group relative flex min-h-11 min-w-11 items-center justify-center rounded-2xl border p-3 transition ${
              isActive
                ? 'border-transparent text-white'
                : 'border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span
              role="tooltip"
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 z-30 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--theme-text)] opacity-0 shadow-lg transition-opacity md:left-full md:ml-3 md:mt-0 md:block md:translate-x-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100"
            >
              {name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
