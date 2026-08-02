import type { BoardTheme } from './types';

/**
 * The board colour registry. Adding an eleventh theme means adding an entry
 * here and nothing else: the id union, the picker, and the CSS variables all
 * derive from this array.
 *
 * Coordinate colours follow the opposite-square rule (`lightCoord` is the
 * theme's dark value, `darkCoord` its light value) with three deliberate
 * exceptions — marble, midnight and neon — noted inline.
 */
export const BOARD_THEMES = [
  {
    id: 'tournament-green',
    name: 'Tournament Green',
    light: '#EBECD0',
    dark: '#779556',
    lightCoord: '#779556',
    darkCoord: '#EBECD0',
    border: '#5C7043',
    scheme: 'light',
  },
  {
    id: 'boxwood',
    name: 'Boxwood',
    light: '#F0D9B5',
    dark: '#B58863',
    lightCoord: '#B58863',
    darkCoord: '#F0D9B5',
    border: '#8C6748',
    scheme: 'light',
  },
  {
    id: 'walnut',
    name: 'Walnut',
    light: '#DCC29C',
    dark: '#8B5A3C',
    lightCoord: '#8B5A3C',
    darkCoord: '#DCC29C',
    border: '#6B432B',
    scheme: 'light',
  },
  {
    id: 'slate',
    name: 'Slate',
    light: '#DEE3E6',
    dark: '#788A9E',
    lightCoord: '#788A9E',
    darkCoord: '#DEE3E6',
    border: '#5B6B7C',
    scheme: 'light',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    light: '#E4F1F7',
    dark: '#7FA9C4',
    lightCoord: '#7FA9C4',
    darkCoord: '#E4F1F7',
    border: '#5F87A0',
    scheme: 'light',
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    light: '#E9E2F3',
    dark: '#8A76B8',
    lightCoord: '#8A76B8',
    darkCoord: '#E9E2F3',
    border: '#6B5A94',
    scheme: 'light',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    light: '#F2DFD3',
    dark: '#C07B5E',
    lightCoord: '#C07B5E',
    darkCoord: '#F2DFD3',
    border: '#9A5F45',
    scheme: 'light',
  },
  {
    // The two squares are too close in value for the opposite-square rule to
    // stay readable, so the labels are tinted greys instead.
    id: 'marble',
    name: 'Marble',
    light: '#F7F7F5',
    dark: '#C2C2BE',
    lightCoord: '#8A8A85',
    darkCoord: '#5F5F5B',
    border: '#9B9B96',
    scheme: 'light',
  },
  {
    // Both squares are dark in practice; the labels need lift, not inversion.
    id: 'midnight',
    name: 'Midnight',
    light: '#5A6474',
    dark: '#2E3440',
    lightCoord: '#262B34',
    darkCoord: '#8A94A6',
    border: '#1E222B',
    scheme: 'dark',
  },
  {
    // The signature theme: labels are the accent on both square colours.
    id: 'neon',
    name: 'Neon',
    light: '#232946',
    dark: '#121629',
    lightCoord: '#7DF9E1',
    darkCoord: '#7DF9E1',
    border: '#0A0D18',
    scheme: 'dark',
  },
] as const satisfies readonly BoardTheme[];

export type BoardThemeId = (typeof BOARD_THEMES)[number]['id'];

export const DEFAULT_THEME_ID: BoardThemeId = 'tournament-green';

const THEMES_BY_ID = new Map<string, BoardTheme>(BOARD_THEMES.map((theme) => [theme.id, theme]));

export function isBoardThemeId(value: unknown): value is BoardThemeId {
  return typeof value === 'string' && THEMES_BY_ID.has(value);
}

/** Returns the named theme, falling back to the default for an unknown id. */
export function getTheme(id: string): BoardTheme {
  return THEMES_BY_ID.get(id) ?? BOARD_THEMES[0];
}
