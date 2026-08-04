import type { PieceColor, PromotionPiece } from '@chess/shared';
import type { Coords } from './board.js';

/** A single step, applied repeatedly by sliding pieces and once by the rest. */
export type Vector = Coords;

const vector = (file: number, rank: number): Vector => ({ file, rank });

/** Rook directions: N, S, E, W. */
export const ORTHOGONAL: readonly Vector[] = [
  vector(0, 1),
  vector(0, -1),
  vector(1, 0),
  vector(-1, 0),
];

/** Bishop directions: NE, NW, SE, SW. */
export const DIAGONAL: readonly Vector[] = [
  vector(1, 1),
  vector(-1, 1),
  vector(1, -1),
  vector(-1, -1),
];

/** Queen and king directions: all eight. */
export const EVERY_DIRECTION: readonly Vector[] = [...ORTHOGONAL, ...DIAGONAL];

export const KNIGHT_STEPS: readonly Vector[] = [
  vector(1, 2),
  vector(2, 1),
  vector(2, -1),
  vector(1, -2),
  vector(-1, -2),
  vector(-2, -1),
  vector(-2, 1),
  vector(-1, 2),
];

/** Which way is forward. White counts up the ranks, black counts down. */
export const PAWN_FORWARD: Record<PieceColor, Vector> = {
  w: vector(0, 1),
  b: vector(0, -1),
};

/**
 * The two squares a pawn attacks, relative to the pawn. Distinct from
 * `PAWN_FORWARD` because a pawn is the one piece that captures differently
 * from how it moves — the source of most attack-detection bugs.
 */
export const PAWN_ATTACKS: Record<PieceColor, readonly Vector[]> = {
  w: [vector(1, 1), vector(-1, 1)],
  b: [vector(1, -1), vector(-1, -1)],
};

/** The rank a pawn starts on, and so the only one it may step twice from. */
export const PAWN_HOME_RANK: Record<PieceColor, number> = { w: 1, b: 6 };

/** The rank a pawn promotes on. */
export const PAWN_PROMOTION_RANK: Record<PieceColor, number> = { w: 7, b: 0 };

/** Every promotion choice. Under-promotion is legal, so all four are generated. */
export const PROMOTION_PIECES: readonly PromotionPiece[] = ['b', 'n', 'q', 'r'];
