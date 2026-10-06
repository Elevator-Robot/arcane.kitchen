import libraryLight from '../assets/sanctuaries/library-light.webp';
import libraryDark from '../assets/sanctuaries/library-dark.webp';
import cottageLight from '../assets/sanctuaries/cottage-light.webp';
import cottageDark from '../assets/sanctuaries/cottage-dark.webp';
import innLight from '../assets/sanctuaries/inn-light.webp';
import innDark from '../assets/sanctuaries/inn-dark.webp';
import gardenLight from '../assets/sanctuaries/garden-light.webp';
import gardenDark from '../assets/sanctuaries/garden-dark.webp';
import observatoryLight from '../assets/sanctuaries/observatory-light.webp';
import observatoryDark from '../assets/sanctuaries/observatory-dark.webp';
import manorLight from '../assets/sanctuaries/manor-light.webp';
import manorDark from '../assets/sanctuaries/manor-dark.webp';
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
    'dough-artificer': { light: gardenLight, dark: gardenDark },
    'spice-alchemist': { light: observatoryLight, dark: observatoryDark },
    'feast-bard': { light: manorLight, dark: manorDark },
  };
