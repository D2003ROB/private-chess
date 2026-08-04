import type { PieceColor } from '@chess/shared';
import type { Coords } from './board.js';

/** A single step, applied repeatedly by sliding pieces and once by the rest. */
export type Vector = Coords;

const step = (file: number, rank: number): Vector => ({ file, rank });

/** Rook directions: N, S, E, W. */
export const ORTHOGONAL: readonly Vector[] = [step(0, 1), step(0, -1), step(1, 0), step(-1, 0)];

/** Bishop directions: NE, NW, SE, SW. */
export const DIAGONAL: readonly Vector[] = [step(1, 1), step(-1, 1), step(1, -1), step(-1, -1)];

/** Queen and king directions: all eight. */
export const EVERY_DIRECTION: readonly Vector[] = [...ORTHOGONAL, ...DIAGONAL];

export const KNIGHT_STEPS: readonly Vector[] = [
  step(1, 2),
  step(2, 1),
  step(2, -1),
  step(1, -2),
  step(-1, -2),
  step(-2, -1),
  step(-2, 1),
  step(-1, 2),
];

/** Which way is forward. White counts up the ranks, black counts down. */
export const PAWN_FORWARD: Record<PieceColor, Vector> = {
  w: step(0, 1),
  b: step(0, -1),
};

/** The rank a pawn starts on, and so the only one it may step twice from. */
export const PAWN_HOME_RANK: Record<PieceColor, number> = { w: 1, b: 6 };
