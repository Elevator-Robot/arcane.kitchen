import salemLight from '../assets/familiars/salem-light.webp';
import salemDark from '../assets/familiars/salem-dark.webp';
import veyrLight from '../assets/familiars/veyr-light.webp';
import veyrDark from '../assets/familiars/veyr-dark.webp';
import orinLight from '../assets/familiars/orin-light.webp';
import orinDark from '../assets/familiars/orin-dark.webp';
import vesperLight from '../assets/familiars/vesper-light.webp';
import vesperDark from '../assets/familiars/vesper-dark.webp';
import morrowLight from '../assets/familiars/morrow-light.webp';
import morrowDark from '../assets/familiars/morrow-dark.webp';
import lunaLight from '../assets/familiars/luna-light.webp';
import lunaDark from '../assets/familiars/luna-dark.webp';
import type { KITCHEN_FAMILIARS } from '../utils/kitchenIdentity';

type FamiliarId = (typeof KITCHEN_FAMILIARS)[number]['id'];

export type FamiliarArtwork = {
  light: string;
  dark: string;
};

export const FAMILIAR_ARTWORK: Record<FamiliarId, FamiliarArtwork> = {
  cat: { light: salemLight, dark: salemDark },
  dragon: { light: veyrLight, dark: veyrDark },
  owl: { light: orinLight, dark: orinDark },
  fox: { light: vesperLight, dark: vesperDark },
  frog: { light: morrowLight, dark: morrowDark },
  rabbit: { light: lunaLight, dark: lunaDark },
};
