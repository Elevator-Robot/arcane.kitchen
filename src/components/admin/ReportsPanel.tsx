import { useState } from 'react';
import { randomMerlinColor } from '../../theme/merlinPalette';

const CATEGORIES = [
  {
    id: 'open',
    label: 'Open · 0',
    title: 'No open reports',
    copy: 'When a cook flags a recipe or comment, it lands here with everything you need to act.',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    title: 'No resolved reports',
    copy: 'Reports you have acted on will be kept here.',
  },
  {
    id: 'dismissed',
    label: 'Dismissed',
    title: 'No dismissed reports',
    copy: 'Reports dismissed without action will be kept here.',
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

export default function ReportsPanel() {
  const [category, setCategory] = useState<CategoryId>('open');
  const [activeColor, setActiveColor] = useState(randomMerlinColor);
  const active =
    CATEGORIES.find((entry) => entry.id === category) ?? CATEGORIES[0];

  return (
    <div className="mt-5 space-y-4">
      <div
        role="group"
        aria-label="Report status"
        className="flex flex-wrap gap-2"
      >
        {CATEGORIES.map((entry) => {
          const isActive = entry.id === category;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setCategory(entry.id);
                setActiveColor(randomMerlinColor());
              }}
              style={
                isActive
                  ? { backgroundColor: activeColor, borderColor: activeColor }
                  : undefined
              }
              className={`min-h-11 rounded-full border px-5 text-sm font-semibold transition ${
                isActive
                  ? 'border-transparent text-white'
                  : 'border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      <div className="ak-empty-state">
        <h3 className="text-xl">{active.title}</h3>
        <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
          {active.copy}
        </p>
      </div>
      <p className="text-xs text-[var(--theme-text-muted)]">
        Recipes and comments can’t be flagged yet, so there is nothing to
        triage. This placeholder fills in once reporting ships.
      </p>
    </div>
  );
}
