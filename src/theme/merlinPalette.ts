// Merlin-inspired accent palette for Arcane Kitchen.
// Deep wizards' indigo, amethyst, and arcane-cyan tones that read well with
// white text. Add/remove entries here and every consumer updates.
export const MERLIN_PALETTE = [
  '#6d28d9', // amethyst
  '#4338ca', // royal indigo
  '#0e7490', // arcane teal
  '#7c3aed', // mystic violet
  '#1e40af', // midnight blue
  '#a21caf', // plum magic
  '#3730a3', // indigo night
  '#0891b2', // frost teal
  '#5b21a7', // deep violet
  '#155e75', // dark teal
] as const;

export const randomMerlinColor = (): string =>
  MERLIN_PALETTE[Math.floor(Math.random() * MERLIN_PALETTE.length)];
