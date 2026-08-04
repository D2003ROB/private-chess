import type { Board, Piece, PieceType, Square } from '@chess/shared';
import { toCoords, toSquare, type Coords } from './board.js';
import {
  DIAGONAL,
  EVERY_DIRECTION,
  KNIGHT_STEPS,
  ORTHOGONAL,
  PAWN_FORWARD,
  PAWN_HOME_RANK,
  type Vector,
} from './offsets.js';

/**
 * Quiet moves only — the squares a piece can move to on an otherwise empty
 * board, minus whatever gets in the way. No captures, no check, no pins: a
 * destination is legal here if the geometry allows it and the square is empty.
 */

/** Everything but the pawn is a direction list walked a fixed number of times. */
type Pattern = { directions: readonly Vector[]; range: number };

const SLIDING: readonly PieceType[] = ['q', 'r', 'b'];

const DIRECTIONS: Record<Exclude<PieceType, 'p'>, readonly Vector[]> = {
  k: EVERY_DIRECTION,
  q: EVERY_DIRECTION,
  r: ORTHOGONAL,
  b: DIAGONAL,
  n: KNIGHT_STEPS,
};

/**
 * Walks one direction from `origin`, at most `range` times, collecting empty
 * squares. It stops at the edge of the board or at the first piece — and the
 * occupied square is never collected, because landing on it would be a
 * capture.
 *
 * This is the whole module: sliders walk seven steps, kings and knights walk
 * one, and a pawn walks one or two.
 */
function walk(board: Board, origin: Coords, direction: Vector, range: number): Square[] {
  const reached: Square[] = [];
  let at = origin;

  for (let taken = 0; taken < range; taken += 1) {
    at = { file: at.file + direction.file, rank: at.rank + direction.rank };
    const square = toSquare(at);

    if (!square || board[square]) break;

    reached.push(square);
  }

  return reached;
}

function patternFor(piece: Piece, origin: Coords): Pattern {
  if (piece.type === 'p') {
    // A pawn is a one-direction walker whose range is two from its home rank.
    // Walking rather than testing the two squares separately is what makes the
    // double step disappear when the single step is blocked.
    return {
      directions: [PAWN_FORWARD[piece.color]],
      range: origin.rank === PAWN_HOME_RANK[piece.color] ? 2 : 1,
    };
  }

  return {
    directions: DIRECTIONS[piece.type],
    range: SLIDING.includes(piece.type) ? 7 : 1,
  };
}

/**
 * The squares the piece on `from` can move to, in ascending algebraic order.
 * Empty square, or a piece with nowhere to go, gives `[]`.
 *
 * Pure: the board is only ever read, and the same board always gives the same
 * answer. Throws `InvalidSquareError` if `from` is not a square name.
 */
export function movesFor(board: Board, from: Square): Square[] {
  const origin = toCoords(from);
  const piece = board[from];

  if (!piece) return [];

  const { directions, range } = patternFor(piece, origin);

  // Square names sort lexicographically into a1..h8 because a rank is a single
  // digit, so the default comparator is the ascending order the API promises.
  return directions.flatMap((direction) => walk(board, origin, direction, range)).sort();
}
