import { useId, useState } from 'react';
import Button from './ui/Button';

type Props = {
  tags: { label: string; count: number }[];
  selected: ReadonlyMap<string, string>;
  onSelect: (tag: string) => void;
  onClear: () => void;
};

export default function RecipeTagFilters({
  tags,
  selected,
  onSelect,
  onClear,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  if (!tags.length) return null;
  const visible = expanded
    ? tags
    : tags.filter(
        (tag, index) => index < 6 || selected.has(tag.label.toLowerCase())
      );
  return (
    <section
      aria-label="Community recipe tags"
      aria-describedby={`${id}-hint`}
      data-expanded={expanded}
    >
      <p className="ak-eyebrow mb-2 text-[var(--theme-text-muted)]">
        Community tags
      </p>
      <p id={`${id}-hint`} className="sr-only">
        Select one or more tags. Recipes must match every selected tag.
      </p>
      <div id={id} className="ak-tag-list flex flex-wrap gap-2 p-1">
        {visible.map(({ label, count }) => {
          const color = selected.get(label.toLowerCase());
          const active = selected.has(label.toLowerCase());
          return (
            <Button
              key={label}
              variant="choice"
              size="none"
              aria-label={`Filter by ${label}`}
              aria-pressed={active}
              title={`${count} ${count === 1 ? 'recipe' : 'recipes'}${active ? ' · Click again to remove this tag' : ''}`}
              onClick={() => onSelect(label)}
              style={active ? { backgroundColor: color } : undefined}
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
      {(tags.length > 6 || selected.size > 0) && (
        <div className="ak-tag-actions flex flex-wrap items-center gap-2">
          {tags.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              aria-controls={id}
              onClick={() => setExpanded((value) => !value)}
              className="text-xs"
            >
              {expanded ? 'Show fewer tags' : `Show all ${tags.length} tags`}
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Clear tag filters"
              onClick={onClear}
              className="text-xs"
            >
              Clear tags
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
