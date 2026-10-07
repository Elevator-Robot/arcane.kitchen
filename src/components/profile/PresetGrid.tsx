type Props = {
  selected?: string | null;
  onSelect: (file: string) => void;
};

import { useState } from 'react';
import { randomMerlinColor } from '../../theme/merlinPalette';
import Button from '../ui/Button';
import { DEFAULT_AVATAR_FILES } from '../../utils/userProfiles';

const presets = import.meta.glob('/src/assets/avatars/*.{png,webp,jpg}', {
  eager: true,
}) as Record<string, { default: string }>;

export default function PresetGrid({ selected, onSelect }: Props) {
  const [selectionColor] = useState(randomMerlinColor);
  const entries = Object.entries(presets)
    .filter(([path]) =>
      DEFAULT_AVATAR_FILES.some((file) => path.endsWith(`/${file}`))
    )
    .map(([path, mod]) => ({
      file: path.split('/').pop()!,
      url: mod.default,
    }));

  return (
    <div className="grid grid-cols-3 gap-3 p-1 sm:grid-cols-4 md:grid-cols-5">
      {entries.map(({ file, url }) => (
        <Button
          variant="image"
          size="none"
          key={file}
          type="button"
          aria-pressed={selected === file}
          aria-label={file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}
          onClick={() => onSelect(file)}
          style={
            selected === file
              ? { boxShadow: `0 0 0 2px ${selectionColor}` }
              : undefined
          }
          className="ak-identity-art-card relative overflow-hidden rounded-xl"
        >
          <img
            src={url}
            alt={file}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
          <span className="ak-identity-art-label absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-black/30 px-2 pb-2 pt-5 text-xs font-semibold capitalize text-white">
            {file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}
          </span>
        </Button>
      ))}
    </div>
  );
}
