import type { CSSProperties } from 'react';
import { kitchenTheme } from '../utils/kitchenIdentity';

/** Scope the viewer's saved atmosphere to the app, never the profile being visited. */
export function sanctuaryThemeStyle(themeId?: string): CSSProperties {
  const theme = kitchenTheme(themeId || 'moonlit');
  return {
    '--sanctuary-background': theme.background,
    '--theme-accent': theme.accent,
    '--theme-accent-strong': `color-mix(in srgb, ${theme.accent} 82%, #17132e)`,
    '--theme-focus': `color-mix(in srgb, ${theme.accent} 18%, transparent)`,
  } as CSSProperties;
}

export const sanctuaryBackground = `var(--sanctuary-background, ${kitchenTheme('moonlit').background})`;
