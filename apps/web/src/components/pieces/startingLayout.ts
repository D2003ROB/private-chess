import type { Square } from '../board';
import type { PieceRef } from './types';

/**
 * The initial position, written out. This is a literal on purpose — FEN
 * parsing belongs to the game-logic ticket, and nothing here should imply the
 * board knows how to read a position.
 */
export const STARTING_LAYOUT: Partial<Record<Square, PieceRef>> = {
  a8: { type: 'r', color: 'b' },
  b8: { type: 'n', color: 'b' },
  c8: { type: 'b', color: 'b' },
  d8: { type: 'q', color: 'b' },
  e8: { type: 'k', color: 'b' },
  f8: { type: 'b', color: 'b' },
  g8: { type: 'n', color: 'b' },
  h8: { type: 'r', color: 'b' },

  a7: { type: 'p', color: 'b' },
  b7: { type: 'p', color: 'b' },
  c7: { type: 'p', color: 'b' },
  d7: { type: 'p', color: 'b' },
  e7: { type: 'p', color: 'b' },
  f7: { type: 'p', color: 'b' },
  g7: { type: 'p', color: 'b' },
  h7: { type: 'p', color: 'b' },

  a2: { type: 'p', color: 'w' },
  b2: { type: 'p', color: 'w' },
  c2: { type: 'p', color: 'w' },
  d2: { type: 'p', color: 'w' },
  e2: { type: 'p', color: 'w' },
  f2: { type: 'p', color: 'w' },
  g2: { type: 'p', color: 'w' },
  h2: { type: 'p', color: 'w' },

  a1: { type: 'r', color: 'w' },
  b1: { type: 'n', color: 'w' },
  c1: { type: 'b', color: 'w' },
  d1: { type: 'q', color: 'w' },
  e1: { type: 'k', color: 'w' },
  f1: { type: 'b', color: 'w' },
  g1: { type: 'n', color: 'w' },
  h1: { type: 'r', color: 'w' },
};
