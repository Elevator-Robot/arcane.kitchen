import { MERLIN_PALETTE } from '../theme/merlinPalette';

export const KITCHEN_THEMES = [
  {
    id: 'moonlit',
    name: 'The Wanderer',
    note: 'Forgotten roads & recipes carried between hearths',
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
    name: 'The Raven',
    note: 'Watchful wings & tidings from abandoned places',
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
    name: 'The Wyrm',
    note: 'Bold appetite & a gift for flame',
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
    name: 'The Watcher',
    note: 'Silent vigils & signs in distant stars',
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
    name: 'The Sage',
    note: 'Patient study & knowledge preserved in the margins',
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
    name: 'The Fae',
    note: 'Hidden paths & bargains made at the woodland edge',
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
    name: 'The Witch',
    note: 'Old customs & the quiet keeping of forbidden craft',
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
    name: 'The Sorcerer',
    note: 'Unbidden power & an inheritance without a name',
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
  {
    id: 'moth',
    name: 'The Mage',
    note: 'Measured rites & the patient shaping of the unseen',
    accent: '#a86118',
    background: 'linear-gradient(120deg, #211a1c, #59402f 62%, #ad7635)',
    page: '#f5f0e8',
    pageSoft: '#e9dfcf',
    surface: '#fcfaf5',
    surfaceAlt: '#eee3d2',
    text: '#30251f',
    textMuted: '#706157',
    border: '#d8c9b5',
    borderStrong: '#b7a086',
    glow: '#c1843d',
    symbol: '✣',
  },
] as const;

export const KITCHEN_CLASSES = [
  {
    id: 'kitchen-witch',
    name: 'Hedge Witch',
    icon: '☾',
  },
  {
    id: 'hearthkeeper',
    name: 'Ashkeeper',
    icon: '♨',
  },
  {
    id: 'herb-druid',
    name: 'Alchemist',
    icon: '⚗',
  },
  {
    id: 'dough-artificer',
    name: 'Ritualist',
    icon: '△',
  },
  {
    id: 'spice-alchemist',
    name: 'Root Seer',
    icon: '❧',
  },
  {
    id: 'feast-bard',
    name: 'Crypt Warden',
    icon: '◈',
  },
] as const;

export const KITCHEN_FAMILIARS = [
  {
    id: 'cat',
    name: 'Salem',
    symbol: '🐈‍⬛',
    note: 'A black cat who watches the door long before anyone knocks.',
  },
  {
    id: 'dragon',
    name: 'Veyr',
    symbol: '🐉',
    note: 'A small dragon curled around the last coal. The hearth never quite goes cold.',
  },
  {
    id: 'owl',
    name: 'Orin',
    symbol: '🦉',
    note: 'An owl that returns at dusk, carrying the scent of rooms long sealed.',
  },
  {
    id: 'fox',
    name: 'Vesper',
    symbol: '🦊',
    note: 'A fox that leads you to the forest edge, then waits for you to remember the path.',
  },
  {
    id: 'frog',
    name: 'Morrow',
    symbol: '🐸',
    note: 'A frog from the well beneath the house. Its voice is older than the stones.',
  },
  {
    id: 'rabbit',
    name: 'Luna',
    symbol: '🐇',
    note: 'A pale rabbit found among the winter roots. No tracks led to its burrow.',
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
