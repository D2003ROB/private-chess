import type { Board, PieceColor, Position, Square } from '@chess/shared';
import { ALL_SQUARES, opponent, squareColor } from './board.js';
import { isInCheck } from './attacks.js';
import { positionKey } from './fen.js';
import { legalMoves } from './moves.js';

/**
 * Whether the game is over, and why.
 *
 * This type is named for the chess verdict, not the `GameStatus` lifecycle
 * enum in `@chess/shared` — that one is a stored database column
 * (`PENDING | ACTIVE | COMPLETED`), this one is computed from a position and
 * never persisted. They share a name because both names are right; they live
 * in different packages so neither has to be wrong.
 */
export type GameStatus =
  | { state: 'playing'; check: boolean }
  | { state: 'checkmate'; winner: PieceColor }
  | { state: 'stalemate' }
  | { state: 'draw'; reason: 'fifty-move' | 'insufficient-material' | 'threefold' };

/**
 * Whether checkmate has become impossible by material alone: K vs K, a lone
 * minor against a bare king, or one bishop each on the same square colour.
 *
 * K+N+N vs K is **not** here. Mate cannot be forced with two knights, but it
 * can be reached against imperfect defence, so the position is still playing.
 */
function insufficientMaterial(board: Board): boolean {
  const minors: { color: PieceColor; square: Square; type: 'b' | 'n' }[] = [];

  for (const square of ALL_SQUARES) {
    const piece = board[square];
    if (!piece || piece.type === 'k') continue;

    // A pawn can promote, and a rook or queen mates on its own.
    if (piece.type !== 'b' && piece.type !== 'n') return false;

    minors.push({ color: piece.color, square, type: piece.type });
  }

  if (minors.length <= 1) return true;
  if (minors.length > 2) return false;

  const [first, second] = minors;
  if (!first || !second) return false;

  return (
    first.type === 'b' &&
    second.type === 'b' &&
    first.color !== second.color &&
    squareColor(first.square) === squareColor(second.square)
  );
}

function occurrences(history: readonly string[], key: string): number {
  return history.filter((entry) => entry === key).length;
}

/**
 * The state of the game for the side to move.
 *
 * `history` is the list of `positionKey` values the game has produced,
 * including the current position; without it, repetition cannot be known and
 * is skipped rather than guessed at.
 */
export function gameStatus(position: Position, history?: readonly string[]): GameStatus {
  const check = isInCheck(position);

  // Checkmate and stalemate differ by exactly this one test, so they are one
  // branch — written apart, they can drift and disagree.
  if (legalMoves(position).length === 0) {
    return check ? { state: 'checkmate', winner: opponent(position.turn) } : { state: 'stalemate' };
  }

  if (insufficientMaterial(position.board)) {
    return { state: 'draw', reason: 'insufficient-material' };
  }

  // Plies, not moves: fifty moves by each player.
  if (position.halfmoveClock >= 100) {
    return { state: 'draw', reason: 'fifty-move' };
  }

  if (history && occurrences(history, positionKey(position)) >= 3) {
    return { state: 'draw', reason: 'threefold' };
  }

  return { state: 'playing', check };
}
