import wanderer from '../assets/birthsigns/wanderer.webp';
import raven from '../assets/birthsigns/raven.webp';
import wyrm from '../assets/birthsigns/wyrm.webp';
import watcher from '../assets/birthsigns/watcher.webp';
import sage from '../assets/birthsigns/sage.webp';
import fae from '../assets/birthsigns/fae.webp';
import witch from '../assets/birthsigns/witch.webp';
import sorcerer from '../assets/birthsigns/sorcerer.webp';
import mage from '../assets/birthsigns/mage.webp';
import type { KITCHEN_THEMES } from '../utils/kitchenIdentity';

// Artwork follows the existing persisted theme IDs, not the display names.
export const BIRTHSIGN_ARTWORK: Record<
  (typeof KITCHEN_THEMES)[number]['id'],
  string
> = {
  moonlit: wanderer,
  grove: raven,
  ember: wyrm,
  celestial: watcher,
  sunroom: sage,
  tidepool: fae,
  berry: witch,
  frost: sorcerer,
  moth: mage,
};
