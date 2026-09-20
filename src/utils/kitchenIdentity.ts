import { MERLIN_PALETTE } from '../theme/merlinPalette';

export const KITCHEN_THEMES = [
  {
    id: 'moonlit',
    name: 'Moonlit library',
    note: 'Midnight recipes & a little mystery',
    accent: MERLIN_PALETTE[0],
    background: 'linear-gradient(120deg, #17132e, #433065 65%, #77527a)',
    symbol: '☾',
  },
  {
    id: 'grove',
    name: 'Enchanted grove',
    note: 'Wild herbs & woodland gatherings',
    accent: MERLIN_PALETTE[2],
    background: 'linear-gradient(120deg, #102c2d, #23564f 65%, #69806b)',
    symbol: '❧',
  },
  {
    id: 'ember',
    name: 'Dragon’s hearth',
    note: 'Bold flavors & fireside feasts',
    accent: MERLIN_PALETTE[5],
    background: 'linear-gradient(120deg, #30162e, #713447 65%, #b96a55)',
    symbol: '✦',
  },
  {
    id: 'celestial',
    name: 'Celestial observatory',
    note: 'Cosmic curiosity & starlit suppers',
    accent: MERLIN_PALETTE[4],
    background: 'linear-gradient(120deg, #14213d, #304e78 65%, #63759e)',
    symbol: '✧',
  },
] as const;

export const KITCHEN_CLASSES = [
  {
    id: 'kitchen-witch',
    name: 'Kitchen Witch',
    icon: '✦',
    description: 'A little intuition. A generous pinch of magic.',
  },
  {
    id: 'hearthkeeper',
    name: 'Hearthkeeper',
    icon: '♨',
    description: 'Comfort food and a place for everyone at the table.',
  },
  {
    id: 'herb-druid',
    name: 'Herb Druid',
    icon: '❧',
    description: 'Rooted in the garden. Guided by the seasons.',
  },
  {
    id: 'dough-artificer',
    name: 'Dough Artificer',
    icon: '⚒',
    description: 'Turning flour, patience, and curiosity into treasure.',
  },
  {
    id: 'spice-alchemist',
    name: 'Spice Alchemist',
    icon: '⚗',
    description: 'Bold experiments. Unexpected combinations.',
  },
  {
    id: 'feast-bard',
    name: 'Feast Bard',
    icon: '♫',
    description: 'Every dish has a story worth sharing.',
  },
] as const;

export const KITCHEN_FAMILIARS = [
  {
    id: 'cat',
    name: 'Cauldron cat',
    symbol: '🐈‍⬛',
    note: 'Supervises every spell. Steals the cream.',
  },
  {
    id: 'dragon',
    name: 'Pocket dragon',
    symbol: '🐉',
    note: 'An enthusiastic assistant for anything flambéed.',
  },
  {
    id: 'owl',
    name: 'Pantry owl',
    symbol: '🦉',
    note: 'Remembers the recipe you forgot to write down.',
  },
  {
    id: 'fox',
    name: 'Foraging fox',
    symbol: '🦊',
    note: 'Always knows where the good ingredients grow.',
  },
  {
    id: 'frog',
    name: 'Potion frog',
    symbol: '🐸',
    note: 'A patient companion for slow-simmered wonders.',
  },
  {
    id: 'rabbit',
    name: 'Flour-dusted rabbit',
    symbol: '🐇',
    note: 'First to the bakery. Last to leave a crumb.',
  },
] as const;

export const PANTRY_CHARMS = [
  'Rosemary',
  'Garlic',
  'Mushrooms',
  'Honey',
  'Chili',
  'Cinnamon',
  'Lemon',
  'Ginger',
  'Chocolate',
  'Sourdough',
  'Basil',
  'Vanilla',
] as const;

export type KitchenIdentity = {
  theme: string;
  calling: string;
  familiar: string;
  motto: string;
  quest: string;
  pantry: string[];
  signatureRecipeId: string;
};

export const DEFAULT_KITCHEN_IDENTITY: KitchenIdentity = {
  theme: 'moonlit',
  calling: 'kitchen-witch',
  familiar: 'cat',
  motto: '',
  quest: '',
  pantry: [],
  signatureRecipeId: '',
};

/** Treat cached and backend JSON as untrusted; old profiles get gentle defaults. */
export function normalizeKitchenIdentity(value: unknown): KitchenIdentity {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = null;
    }
  }
  const input =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const text = (key: string, max: number) =>
    typeof input[key] === 'string' ? input[key].trim().slice(0, max) : '';
  return {
    theme:
      KITCHEN_THEMES.find(({ id }) => id === input.theme)?.id ||
      DEFAULT_KITCHEN_IDENTITY.theme,
    calling:
      KITCHEN_CLASSES.find(({ id }) => id === input.calling)?.id ||
      DEFAULT_KITCHEN_IDENTITY.calling,
    familiar:
      KITCHEN_FAMILIARS.find(({ id }) => id === input.familiar)?.id ||
      DEFAULT_KITCHEN_IDENTITY.familiar,
    motto: text('motto', 80),
    quest: text('quest', 140),
    pantry: Array.isArray(input.pantry)
      ? [
          ...new Set(
            input.pantry.filter(
              (item): item is (typeof PANTRY_CHARMS)[number] =>
                PANTRY_CHARMS.includes(item as (typeof PANTRY_CHARMS)[number])
            )
          ),
        ].slice(0, 3)
      : [],
    signatureRecipeId: text('signatureRecipeId', 200),
  };
}

export const kitchenTheme = (id: string) =>
  KITCHEN_THEMES.find((theme) => theme.id === id) || KITCHEN_THEMES[0];
export const kitchenCalling = (id: string) =>
  KITCHEN_CLASSES.find((calling) => calling.id === id) || KITCHEN_CLASSES[0];
export const kitchenFamiliar = (id: string) =>
  KITCHEN_FAMILIARS.find((familiar) => familiar.id === id) ||
  KITCHEN_FAMILIARS[0];
