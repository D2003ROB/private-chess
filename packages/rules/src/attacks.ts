import type { Board, Piece, PieceColor, PieceType, Position, Square } from '@chess/shared';
import { findKing, opponent, step, toCoords, toSquare, type Coords } from './board.js';
import { EVERY_DIRECTION, KNIGHT_STEPS, PAWN_ATTACKS, type Vector } from './offsets.js';

/**
 * Attack detection, scanned outward from the target square.
 *
 * This must never call the move generator, for two reasons. Legal move
 * generation calls *this* to validate its candidates, so the recursion would
 * not terminate; and a pawn attacks its two diagonals whether or not a pawn
 * move to those squares exists — an empty square diagonally ahead of a pawn is
 * attacked but not moveable-to. Asking "can something move here?" is a
 * different question from "is this covered?", and only the second one is this.
 */

function pieceAt(board: Board, at: Coords): Piece | undefined {
  const square = toSquare(at);
  return square ? board[square] : undefined;
}

/** Is any `by`-coloured piece of this type exactly one of these offsets away? */
function adjacent(
  board: Board,
  target: Coords,
  offsets: readonly Vector[],
  type: PieceType,
  by: PieceColor,
): boolean {
  return offsets.some((offset) => {
    const piece = pieceAt(board, step(target, offset));
    return piece?.type === type && piece.color === by;
  });
}

/** Whether `by` attacks `square` — occupied or not, and regardless of pins. */
export function isSquareAttacked(position: Position, square: Square, by: PieceColor): boolean {
  const target = toCoords(square);
  const { board } = position;

  // Pawns. An attacker stands where a pawn of `by` would have to be for its
  // capture vector to land here, which is that vector reversed.
  const pawnOrigins = PAWN_ATTACKS[by].map(({ file, rank }) => ({ file: -file, rank: -rank }));
  if (adjacent(board, target, pawnOrigins, 'p', by)) return true;

  // Knight and king offsets are symmetric, so they need no reversing. A king
  // counting as an attacker is what stops the two kings standing adjacent.
  if (adjacent(board, target, KNIGHT_STEPS, 'n', by)) return true;
  if (adjacent(board, target, EVERY_DIRECTION, 'k', by)) return true;

  // Sliders: only the first piece along each ray can be attacking through it.
  for (const direction of EVERY_DIRECTION) {
    const straight = direction.file === 0 || direction.rank === 0;
    let at = step(target, direction);

    for (;;) {
      const reached = toSquare(at);
      if (!reached) break;

      const piece = board[reached];
      if (piece) {
        if (piece.color === by && (piece.type === 'q' || piece.type === (straight ? 'r' : 'b'))) {
          return true;
        }
        break;
      }

      at = step(at, direction);
    }
  }

  return false;
}

/**
 * Whether that side's king stands on an attacked square. A position with no
 * king of that colour — legal in tests, never in a game — is not in check.
 */
export function isInCheck(position: Position, color: PieceColor = position.turn): boolean {
  const king = findKing(position.board, color);
  return king ? isSquareAttacked(position, king, opponent(color)) : false;
}
