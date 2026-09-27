import type { CSSProperties } from 'react';
import { kitchenTheme } from '../utils/kitchenIdentity';

/** Scope the viewer's saved atmosphere to the app, never the profile being visited. */
export function sanctuaryThemeStyle(themeId?: string): CSSProperties {
  const theme = kitchenTheme(themeId || 'moonlit');
  return {
    '--sanctuary-background': theme.background,
    '--theme-bg': theme.page,
    '--theme-bg-soft': theme.pageSoft,
    '--theme-surface': theme.surface,
    '--theme-surface-alt': theme.surfaceAlt,
    '--theme-text': theme.text,
    '--theme-text-muted': theme.textMuted,
    '--theme-border': theme.border,
    '--theme-border-strong': theme.borderStrong,
    '--theme-accent': theme.accent,
    '--theme-accent-strong': `color-mix(in srgb, ${theme.accent} 82%, #17132e)`,
    '--theme-focus': `color-mix(in srgb, ${theme.accent} 18%, transparent)`,
    '--theme-glow': theme.glow,
    '--theme-overlay': `color-mix(in srgb, ${theme.text} 68%, transparent)`,
  } as CSSProperties;
}

export const sanctuaryBackground = `var(--sanctuary-background, ${kitchenTheme('moonlit').background})`;
