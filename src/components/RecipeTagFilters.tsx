import { useId, useState } from 'react';
import Button from './ui/Button';

type Props = {
  tags: { label: string; count: number }[];
  selected: string | null;
  selectedColor: string;
  onSelect: (tag: string) => void;
};

export default function RecipeTagFilters({
  tags,
  selected,
  selectedColor,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  if (!tags.length) return null;
  const visible = expanded
    ? tags
    : tags.filter(
        (tag, index) => index < 12 || tag.label.toLowerCase() === selected
      );
  return (
    <section aria-label="Community recipe tags">
      <p className="ak-eyebrow mb-2 text-[var(--theme-text-muted)]">
        Community tags
      </p>
      <div
        id={id}
        className="ak-tag-list flex max-h-52 flex-wrap gap-2 overflow-y-auto p-1"
      >
        {visible.map(({ label, count }) => {
          const active = label.toLowerCase() === selected;
          return (
            <Button
              key={label}
              variant="choice"
              size="none"
              aria-label={`Filter by ${label}`}
              aria-pressed={active}
              title={`${count} ${count === 1 ? 'recipe' : 'recipes'}${active ? ' · Click again to clear' : ''}`}
              onClick={() => onSelect(label)}
              style={active ? { backgroundColor: selectedColor } : undefined}
              className="min-h-10 max-w-full rounded-full px-3 py-2 text-xs"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
              <span
                aria-hidden="true"
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-black/15 text-white' : 'bg-[var(--theme-surface-alt)] text-[var(--theme-text-muted)]'}`}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>
      {tags.length > 12 && (
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs"
        >
          {expanded ? 'Show fewer tags' : `Show all ${tags.length} tags`}
        </Button>
      )}
    </section>
  );
}
