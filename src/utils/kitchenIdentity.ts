import { MERLIN_PALETTE } from '../theme/merlinPalette';

export const KITCHEN_THEMES = [
  {
    id: 'moonlit',
    name: 'Moonlit library',
    note: 'Midnight recipes & a little mystery',
    accent: MERLIN_PALETTE[0],
    background: 'linear-gradient(120deg, #17132e, #433065 65%, #77527a)',
    page: '#f5f0f8',
    pageSoft: '#ebe2f1',
    surface: '#fffafd',
    surfaceAlt: '#eee5f3',
    text: '#271b30',
    textMuted: '#6e5c75',
    border: '#d8c9df',
    borderStrong: '#bba5c6',
    glow: '#8b5fb0',
    symbol: '☾',
  },
  {
    id: 'grove',
    name: 'Enchanted grove',
    note: 'Wild herbs & woodland gatherings',
    accent: MERLIN_PALETTE[2],
    background: 'linear-gradient(120deg, #102c2d, #23564f 65%, #69806b)',
    page: '#f1f4eb',
    pageSoft: '#e1e9d8',
    surface: '#fbfcf7',
    surfaceAlt: '#e5ecdc',
    text: '#1d2b24',
    textMuted: '#5c6e60',
    border: '#cbd7c1',
    borderStrong: '#9fb39d',
    glow: '#568b72',
    symbol: '❧',
  },
  {
    id: 'ember',
    name: 'Dragon’s hearth',
    note: 'Bold flavors & fireside feasts',
    accent: MERLIN_PALETTE[5],
    background: 'linear-gradient(120deg, #30162e, #713447 65%, #b96a55)',
    page: '#fbf0e8',
    pageSoft: '#f3dfd2',
    surface: '#fffaf5',
    surfaceAlt: '#f6e3d7',
    text: '#351c1d',
    textMuted: '#7b5a50',
    border: '#e2c7b7',
    borderStrong: '#c79d89',
    glow: '#c46f5c',
    symbol: '✦',
  },
  {
    id: 'celestial',
    name: 'Celestial observatory',
    note: 'Cosmic curiosity & starlit suppers',
    accent: MERLIN_PALETTE[4],
    background: 'linear-gradient(120deg, #14213d, #304e78 65%, #63759e)',
    page: '#edf2f8',
    pageSoft: '#dce6f2',
    surface: '#f9fbfe',
    surfaceAlt: '#e1e9f4',
    text: '#18263c',
    textMuted: '#596a7f',
    border: '#c5d2e2',
    borderStrong: '#9bafc7',
    glow: '#5579aa',
    symbol: '✧',
  },
  {
    id: 'sunroom',
    name: 'Sunlit conservatory',
    note: 'Citrus, fresh bread & golden afternoons',
    accent: '#9a5b0a',
    background: 'linear-gradient(120deg, #5b3512, #a66b21 62%, #d6a84f)',
    page: '#fbf5e7',
    pageSoft: '#f2e6c8',
    surface: '#fffdf6',
    surfaceAlt: '#f5e9ca',
    text: '#342713',
    textMuted: '#786746',
    border: '#e1d1aa',
    borderStrong: '#c5aa70',
    glow: '#d29b35',
    symbol: '☀',
  },
  {
    id: 'tidepool',
    name: 'Tidepool apothecary',
    note: 'Sea salt, bright herbs & coastal air',
    accent: '#087779',
    background: 'linear-gradient(120deg, #0c3840, #14747a 62%, #63a79d)',
    page: '#edf7f5',
    pageSoft: '#d8ece8',
    surface: '#f8fdfc',
    surfaceAlt: '#dcefeb',
    text: '#153033',
    textMuted: '#567174',
    border: '#bedbd6',
    borderStrong: '#8fbdb5',
    glow: '#36a3a0',
    symbol: '≈',
  },
  {
    id: 'berry',
    name: 'Berryglass salon',
    note: 'Jewel-toned sweets & candlelit company',
    accent: '#9b275d',
    background: 'linear-gradient(120deg, #40152d, #852b59 62%, #c26682)',
    page: '#faeff3',
    pageSoft: '#f2dde5',
    surface: '#fff9fb',
    surfaceAlt: '#f5e1e8',
    text: '#361c29',
    textMuted: '#795969',
    border: '#e2c3cf',
    borderStrong: '#c597aa',
    glow: '#bd5a80',
    symbol: '◆',
  },
  {
    id: 'frost',
    name: 'Frosted great hall',
    note: 'Winter feasts & crystalline calm',
    accent: '#315f9b',
    background: 'linear-gradient(120deg, #26364f, #4f7297 62%, #9bb6ca)',
    page: '#f0f5f7',
    pageSoft: '#dfe9ed',
    surface: '#fbfdfe',
    surfaceAlt: '#e2edf1',
    text: '#20303c',
    textMuted: '#5d707c',
    border: '#c6d5dc',
    borderStrong: '#9db5c0',
    glow: '#6f9fbd',
    symbol: '❄',
  },
] as const;

export const KITCHEN_CLASSES = [
  {
    id: 'kitchen-witch',
    name: 'Herbalist',
    icon: '❧',
    description:
      'Keeper of garden lore, restorative broths, and fragrant leaves.',
  },
  {
    id: 'hearthkeeper',
    name: 'Cook',
    icon: '♨',
    description:
      'Steady at the hearth and practiced in the craft of a generous table.',
  },
  {
    id: 'herb-druid',
    name: 'Alchemist',
    icon: '⚗',
    description:
      'Transforms spice, heat, and curious ingredients through experiment.',
  },
  {
    id: 'dough-artificer',
    name: 'Baker',
    icon: '◇',
    description:
      'Works in flour, fermentation, patience, and the measured warmth of ovens.',
  },
  {
    id: 'spice-alchemist',
    name: 'Forager',
    icon: '⌁',
    description:
      'Reads the seasons and gathers uncommon provisions from field and forest.',
  },
  {
    id: 'feast-bard',
    name: 'Cellarer',
    icon: '◈',
    description:
      'Preserves the harvest and keeps a careful store for leaner seasons.',
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
  sideQuest: string;
  pantry: string[];
  signatureRecipeId: string;
};

export const DEFAULT_KITCHEN_IDENTITY: KitchenIdentity = {
  theme: 'moonlit',
  calling: 'kitchen-witch',
  familiar: 'cat',
  motto: '',
  quest: '',
  sideQuest: '',
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
    sideQuest: text('sideQuest', 140),
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
