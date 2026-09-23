import { Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import type { Draft } from '../../types/profile';
import { useState } from 'react';
import { randomMerlinColor } from '../../theme/merlinPalette';

type Props = {
  draft: Draft;
  onContinue?: (id: Draft['id']) => void;
  onOptions?: (id: Draft['id']) => void;
};

export default function DraftCard({ draft, onContinue, onOptions }: Props) {
  const [actionColor] = useState(randomMerlinColor);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[var(--theme-surface-alt)]">
          {draft.image ? (
            <img
              src={draft.image}
              alt={draft.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--theme-text-muted)]">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--theme-text)]">
            {draft.title}
          </h3>
          <p className="text-xs text-[var(--theme-text-muted)]">
            Last edited {draft.lastEdited}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          size="sm"
          onClick={() => onContinue?.(draft.id)}
          style={{ backgroundColor: actionColor }}
        >
          Continue editing
        </Button>
        <Button
          variant="danger-soft"
          size="icon"
          onClick={() => onOptions?.(draft.id)}
          aria-label={`Delete draft ${draft.title}`}
        >
          <Trash2 className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
