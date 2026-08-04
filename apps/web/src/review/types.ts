import type { Move, PieceColor } from '@chess/shared';
import type { EngineLine, Score } from '../engine';

/**
 * The move labels, in the order they are tested. The first match wins, so the
 * order here *is* the algorithm — see `classify`.
 */
export const CLASSIFICATIONS = [
  'book',
  'forced',
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

/** One position, analysed once. `score` is `lines[0].score`, White-relative. */
export interface PositionEval {
  fen: string;
  depth: number;
  score: Score;
  lines: EngineLine[];
}

export interface MoveReport {
  /** Ply index: `0` is White's first move. */
  ply: number;
  move: Move;
  color: PieceColor;
  classification: Classification;
  /** Win percentage lost by the mover, never negative. */
  winPctLoss: number;
  /** Per-move accuracy, or `null` for moves excluded from the average. */
  accuracy: number | null;
  /** The engine's preference, in long algebraic, when the move played was not it. */
  bestMove: string | null;
  /** White-relative win percentage before and after the move. */
  winPctBefore: number;
  winPctAfter: number;
}

export interface GameReview {
  moves: MoveReport[];
  accuracy: Record<PieceColor, number>;
  counts: Record<PieceColor, Record<Classification, number>>;
  /** One entry per position, so `evals.length === moves.length + 1`. */
  evals: PositionEval[];
  depth: number;
}
