import type { Board, Move, PieceColor, PieceType, Position } from '@chess/shared';
import { applyMove, legalMoves, moveKey, opponent } from '@chess/rules';
import { winPercent, type Score } from '../engine';
import { THRESHOLDS } from './thresholds';
import type { Classification, PositionEval } from './types';

/**
 * Move classification, working in **win probability rather than centipawns**.
 *
 * That is the whole design. A 100cp swing at level is a serious error; the same
 * 100cp at +9 is meaningless. Centipawn thresholds call the second one a
 * blunder, which is exactly why they feel wrong.
 */

export interface ClassifyInput {
  /** Evaluation of the position the move was played from. */
  before: PositionEval;
  /** Evaluation of the position it produced. */
  after: PositionEval;
  move: Move;
  position: Position;
  nextPosition: Position;
  /** The opponent's previous move, for the recapture test. */
  previousMove: Move | null;
  isBook?: boolean;
}

const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Win percentage **for the side that moved**.
 *
 * Everything from the engine is White-relative, which is right for display and
 * wrong here: a 6% drop is a 6% drop whoever played it. Flipping this in the
 * wrong place inverts every Black label, and the output still looks sane —
 * which is why there is a symmetric-fixture test for it.
 */
export function winPercentFor(score: Score, mover: PieceColor): number {
  const white = winPercent(score);
  return mover === 'w' ? white : 100 - white;
}

/** What the mover gave up, never negative — a move cannot gain win probability. */
export function winPercentLoss(input: ClassifyInput): number {
  const mover = input.position.turn;
  const before = winPercentFor(input.before.score, mover);
  const after = winPercentFor(input.after.score, mover);

  return Math.max(0, before - after);
}

function material(board: Board, color: PieceColor): number {
  let total = 0;
  for (const piece of Object.values(board)) {
    if (piece && piece.color === color) total += PIECE_VALUE[piece.type];
  }
  return total;
}

/** The mover's material minus the opponent's. */
function materialBalance(position: Position, mover: PieceColor): number {
  return material(position.board, mover) - material(position.board, opponent(mover));
}

function isBest(input: ClassifyInput): boolean {
  return input.before.lines[0]?.moves[0] === moveKey(input.move);
}

function isForced(input: ClassifyInput): boolean {
  return legalMoves(input.position).length === 1;
}

/**
 * Best, and the alternatives are materially worse — the only move that holds.
 * Without the gap test this fires on every quiet position where six moves are
 * equally fine.
 */
function isGreat(input: ClassifyInput): boolean {
  if (!isBest(input)) return false;

  const mover = input.position.turn;
  const [best, second] = input.before.lines;
  if (!best || !second) return false;

  const gap = winPercentFor(best.score, mover) - winPercentFor(second.score, mover);
  return gap >= THRESHOLDS.great.secondBestGapPct;
}

function isRecapture(input: ClassifyInput): boolean {
  return Boolean(input.previousMove?.captured) && input.previousMove?.to === input.move.to;
}

/**
 * Whether the mover comes out of this down material once the opponent takes
 * what is on offer.
 *
 * A static exchange evaluation would be the rigorous test; playing the engine's
 * own best reply is cheaper, uses an evaluation already in hand, and is right
 * about the cases this label cares about.
 */
function sacrificesMaterial(input: ClassifyInput): boolean {
  const mover = input.position.turn;
  const reply = input.after.lines[0]?.moves[0];
  if (!reply) return false;

  const replyMove = legalMoves(input.nextPosition).find(
    (candidate) => moveKey(candidate) === reply,
  );
  if (!replyMove) return false;

  const settled = applyMove(input.nextPosition, replyMove);
  return materialBalance(settled, mover) < materialBalance(input.position, mover);
}

function isBrilliant(input: ClassifyInput): boolean {
  const mover = input.position.turn;
  const before = winPercentFor(input.before.score, mover);
  const after = winPercentFor(input.after.score, mover);

  // Close enough to the engine's choice to be sound.
  if (winPercentLoss(input) > THRESHOLDS.brilliant.maxLossPct) return false;
  // Already winning comfortably: this is technique, not brilliance.
  if (Math.abs(before - 50) >= THRESHOLDS.brilliant.maxEdgeBeforePct) return false;
  // The sacrifice has to work.
  if (after < THRESHOLDS.brilliant.minWinPctAfter) return false;
  if (isRecapture(input) || isForced(input)) return false;

  return sacrificesMaterial(input);
}

/** The win percentage that `THRESHOLDS.miss.winningCp` corresponds to. */
export const WINNING_WIN_PCT = winPercent({ kind: 'cp', value: THRESHOLDS.miss.winningCp });

/**
 * A won position let slip. Distinct from a blunder: the player did not lose
 * the game, they failed to close it, which is the more useful feedback.
 */
function isMiss(input: ClassifyInput): boolean {
  const mover = input.position.turn;

  return (
    winPercentFor(input.before.score, mover) >= WINNING_WIN_PCT &&
    winPercentFor(input.after.score, mover) < WINNING_WIN_PCT
  );
}

/**
 * Labels one move. Tested in the order of the threshold table, first match
 * wins — so this function's order of statements is the specification.
 */
export function classify(input: ClassifyInput): Classification {
  if (input.isBook) return 'book';
  if (isForced(input)) return 'forced';
  if (isBrilliant(input)) return 'brilliant';
  if (isGreat(input)) return 'great';
  if (isBest(input)) return 'best';

  const loss = winPercentLoss(input);
  if (loss < THRESHOLDS.loss.excellent) return 'excellent';
  if (loss < THRESHOLDS.loss.good) return 'good';
  if (loss < THRESHOLDS.loss.inaccuracy) return 'inaccuracy';
  if (loss < THRESHOLDS.loss.mistake) return 'mistake';

  return isMiss(input) ? 'miss' : 'blunder';
}
