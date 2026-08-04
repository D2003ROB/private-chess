/**
 * The vocabulary of a chess position: squares, pieces, and the map from one to
 * the other. Deliberately free of Zod and of every other import — these types
 * are consumed by `@chess/rules`, which must stay dependency-free at runtime,
 * so anything added here that emits JavaScript lands in the rules package too.
 */

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export type BoardFile = (typeof FILES)[number];
export type BoardRank = (typeof RANKS)[number];

/** Algebraic square name, e.g. `e4`. Independent of board orientation. */
export type Square = `${BoardFile}${BoardRank}`;

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

/** A piece as it appears in a position: what it is and whose it is. */
export interface Piece {
  type: PieceType;
  color: PieceColor;
}

/** What sits on which square. Sparse — an absent key means an empty square. */
export type Board = Partial<Record<Square, Piece>>;

/**
 * The initial position, written out. This is a literal on purpose — FEN
 * parsing belongs to a later ticket, and when it arrives it should produce this
 * same shape rather than replace it.
 */
export const STARTING_LAYOUT: Board = {
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
