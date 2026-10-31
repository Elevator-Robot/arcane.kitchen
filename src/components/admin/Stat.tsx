import { useState } from 'react';
import { randomMerlinColor } from '../../theme/merlinPalette';

export default function Stat({
  label,
  value,
  active,
  onClick,
  loading,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  loading?: boolean;
}) {
  const [activeColor, setActiveColor] = useState(randomMerlinColor);

  return (
    <button
      type="button"
      onClick={() => {
        setActiveColor(randomMerlinColor());
        onClick();
      }}
      aria-pressed={active}
      style={
        active
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : undefined
      }
      className="ak-button-choice rounded-2xl p-3 text-left sm:p-4"
    >
      <p
        className={`text-xs uppercase ${active ? 'text-white' : 'text-[var(--theme-text-muted)]'}`}
      >
        {label}
      </p>
      <p className="mt-2 text-3xl font-heading font-semibold">
        {loading ? '—' : value}
      </p>
      <p
        className={`mt-1 hidden text-xs sm:block ${active ? 'text-white' : 'text-[var(--theme-text-muted)]'}`}
      >
        View {label.toLowerCase()}
      </p>
    </button>
  );
}
