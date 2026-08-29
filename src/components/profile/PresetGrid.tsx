type Props = {
  selected?: string | null;
  onSelect: (file: string) => void;
};

import { useState } from 'react';
import { randomMerlinColor } from '../../theme/merlinPalette';

const presets = import.meta.glob('/src/assets/avatars/*.{png,webp,jpg}', { eager: true }) as Record<string, { default: string }>;

export default function PresetGrid({ selected, onSelect }: Props) {
  const [selectionColor] = useState(randomMerlinColor);
  const entries = Object.entries(presets).map(([path, mod]) => ({ file: path.split('/').pop()!, url: mod.default }));

  return (
    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
      {entries.map(({ file, url }) => (
        <button key={file} onClick={() => onSelect(file)} style={selected === file ? { boxShadow: `0 0 0 2px ${selectionColor}` } : undefined} className="overflow-hidden rounded-lg">
          <img src={url} alt={file} className="w-full h-20 object-cover" />
        </button>
      ))}
    </div>
  );
}
