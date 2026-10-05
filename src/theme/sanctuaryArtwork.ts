import libraryLight from '../assets/sanctuaries/library-light.webp';
import libraryDark from '../assets/sanctuaries/library-dark.webp';
import cottageLight from '../assets/sanctuaries/cottage-light.webp';
import cottageDark from '../assets/sanctuaries/cottage-dark.webp';
import innLight from '../assets/sanctuaries/inn-light.webp';
import innDark from '../assets/sanctuaries/inn-dark.webp';
import type { KITCHEN_CLASSES } from '../utils/kitchenIdentity';

type SanctuaryId = (typeof KITCHEN_CLASSES)[number]['id'];

export type SanctuaryArtwork = {
  light: string;
  dark: string;
};

// Artwork follows persisted calling IDs. Missing entries retain the icon fallback.
export const SANCTUARY_ARTWORK: Partial<Record<SanctuaryId, SanctuaryArtwork>> =
  {
    'kitchen-witch': { light: libraryLight, dark: libraryDark },
    hearthkeeper: { light: cottageLight, dark: cottageDark },
    'herb-druid': { light: innLight, dark: innDark },
  };
