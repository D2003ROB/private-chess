import type { Classification } from './types';

/**
 * How each label is presented.
 *
 * Every glyph is distinct, because several of these colours sit close together
 * in hue and a colour-only encoding fails for a meaningful slice of users. The
 * badge has to survive greyscale, and at the size it renders on a board square.
 *
 * The `!!` / `!` / `?!` / `?` / `??` glyphs are the existing chess annotation
 * marks; the rest are shapes chosen to stay legible when small.
 */
export interface LabelStyle {
  name: string;
  glyph: string;
  /** Background colour of the badge. */
  color: string;
  /** Lightness ordering, so the set reads as a scale without colour. */
  ink: 'light' | 'dark';
  description: string;
}

export const LABELS: Record<Classification, LabelStyle> = {
  book: {
    name: 'Book',
    glyph: 'B',
    color: '#8a7f6d',
    ink: 'light',
    description: 'A known opening move.',
  },
  forced: {
    name: 'Forced',
    glyph: '□',
    color: '#6f7b86',
    ink: 'light',
    description: 'The only legal move.',
  },
  brilliant: {
    name: 'Brilliant',
    glyph: '!!',
    color: '#1baaa6',
    ink: 'light',
    description: 'A sound sacrifice.',
  },
  great: {
    name: 'Great',
    glyph: '!',
    color: '#5b8bb0',
    ink: 'light',
    description: 'The only move that holds.',
  },
  best: {
    name: 'Best',
    glyph: '★',
    color: '#7aa63f',
    ink: 'light',
    description: "The engine's choice.",
  },
  excellent: {
    name: 'Excellent',
    glyph: '✓',
    color: '#96bc4b',
    ink: 'dark',
    description: 'As good as makes no difference.',
  },
  good: {
    name: 'Good',
    glyph: '○',
    color: '#b9c47f',
    ink: 'dark',
    description: 'Gives up a little.',
  },
  inaccuracy: {
    name: 'Inaccuracy',
    glyph: '?!',
    color: '#f0c24b',
    ink: 'dark',
    description: 'Noticeable, not yet costly.',
  },
  mistake: {
    name: 'Mistake',
    glyph: '?',
    color: '#e08b32',
    ink: 'dark',
    description: 'Costly, still recoverable.',
  },
  miss: {
    name: 'Miss',
    glyph: '✗',
    color: '#d75f5f',
    ink: 'light',
    description: 'A won position let slip.',
  },
  blunder: {
    name: 'Blunder',
    glyph: '??',
    color: '#b33430',
    ink: 'light',
    description: 'Loses decisive ground.',
  },
};
