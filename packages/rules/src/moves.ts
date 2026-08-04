import type {
  CastlingRights,
  Move,
  MoveFlag,
  Piece,
  PieceColor,
  PieceType,
  Position,
  PromotionPiece,
  Square,
} from '@chess/shared';
import { ALL_SQUARES, opponent, step, toCoords, toSquare } from './board.js';
import { applyMove } from './apply.js';
import { isInCheck, isSquareAttacked } from './attacks.js';
import {
  DIAGONAL,
  EVERY_DIRECTION,
  KNIGHT_STEPS,
  ORTHOGONAL,
  PAWN_ATTACKS,
  PAWN_FORWARD,
  PAWN_HOME_RANK,
  PAWN_PROMOTION_RANK,
  PROMOTION_PIECES,
  type Vector,
} from './offsets.js';

/**
 * Move generation in two layers.
 *
 * The first is geometry: where could this piece go if nothing but occupancy
 * stopped it. The second is one rule — play the move on a copy and ask whether
 * your own king is now attacked. That single test handles absolute pins,
 * discovered check, moving into check, a king retreating along the checking
 * ray, being obliged to answer an existing check, double check, and the
 * horizontal en-passant pin, none of which are written down anywhere here.
 * Detecting them directly would be seven subtle functions instead.
 */

const DIRECTIONS: Record<Exclude<PieceType, 'p'>, readonly Vector[]> = {
  k: EVERY_DIRECTION,
  q: EVERY_DIRECTION,
  r: ORTHOGONAL,
  b: DIAGONAL,
  n: KNIGHT_STEPS,
};

const SLIDING: readonly PieceType[] = ['q', 'r', 'b'];

interface CastleRule {
  right: keyof CastlingRights;
  flag: MoveFlag;
  king: Square;
  to: Square;
  rook: Square;
  /** Must be vacant — queenside includes the b-file square. */
  empty: readonly Square[];
  /** Must be unattacked: where the king stands, crosses, and lands. */
  safe: readonly Square[];
}

/**
 * The asymmetry between `empty` and `safe` is the whole of the castling
 * subtlety: `b1` must be vacant but may be attacked, because the king never
 * stands on it. Sharing one square list between the two conditions is a real
 * bug that passes casual testing.
 */
const CASTLES: Record<PieceColor, readonly CastleRule[]> = {
  w: [
    {
      right: 'wK',
      flag: 'castle-k',
      king: 'e1',
      to: 'g1',
      rook: 'h1',
      empty: ['f1', 'g1'],
      safe: ['e1', 'f1', 'g1'],
    },
    {
      right: 'wQ',
      flag: 'castle-q',
      king: 'e1',
      to: 'c1',
      rook: 'a1',
      empty: ['b1', 'c1', 'd1'],
      safe: ['e1', 'd1', 'c1'],
    },
  ],
  b: [
    {
      right: 'bK',
      flag: 'castle-k',
      king: 'e8',
      to: 'g8',
      rook: 'h8',
      empty: ['f8', 'g8'],
      safe: ['e8', 'f8', 'g8'],
    },
    {
      right: 'bQ',
      flag: 'castle-q',
      king: 'e8',
      to: 'c8',
      rook: 'a8',
      empty: ['b8', 'c8', 'd8'],
      safe: ['e8', 'd8', 'c8'],
    },
  ],
};

function makeMove(
  from: Square,
  to: Square,
  piece: PieceType,
  captured: PieceType | undefined,
  promotion: PromotionPiece | undefined,
  flags: MoveFlag[],
): Move {
  return {
    from,
    to,
    piece,
    ...(captured ? { captured } : {}),
    ...(promotion ? { promotion } : {}),
    flags,
  };
}

/**
 * A pawn move that reaches the last rank is four moves, not one. Under-
 * promotion is legal, and leaving it out is visible in the perft counts.
 */
function addPawnMove(
  moves: Move[],
  from: Square,
  to: Square,
  captured: PieceType | undefined,
  flags: MoveFlag[],
  color: PieceColor,
): void {
  if (toCoords(to).rank === PAWN_PROMOTION_RANK[color]) {
    for (const promotion of PROMOTION_PIECES) {
      moves.push(makeMove(from, to, 'p', captured, promotion, [...flags, 'promotion']));
    }
    return;
  }

  moves.push(makeMove(from, to, 'p', captured, undefined, flags));
}

function generatePawn(position: Position, from: Square, color: PieceColor, moves: Move[]): void {
  const origin = toCoords(from);
  const forward = PAWN_FORWARD[color];

  // Pushes are non-capturing and are blocked by a piece of either colour.
  const ahead = toSquare(step(origin, forward));
  if (ahead && !position.board[ahead]) {
    addPawnMove(moves, from, ahead, undefined, ['quiet'], color);

    const twoAhead = toSquare(step(step(origin, forward), forward));
    if (origin.rank === PAWN_HOME_RANK[color] && twoAhead && !position.board[twoAhead]) {
      moves.push(makeMove(from, twoAhead, 'p', undefined, undefined, ['quiet', 'double-push']));
    }
  }

  // Captures go diagonally and only onto something: an enemy piece, or the
  // en-passant target, where the pawn taken is not on the destination square.
  for (const attack of PAWN_ATTACKS[color]) {
    const to = toSquare(step(origin, attack));
    if (!to) continue;

    const occupant = position.board[to];
    if (occupant) {
      if (occupant.color !== color) {
        addPawnMove(moves, from, to, occupant.type, ['capture'], color);
      }
    } else if (to === position.epTarget) {
      moves.push(makeMove(from, to, 'p', 'p', undefined, ['capture', 'ep']));
    }
  }
}

function generateCastles(position: Position, color: PieceColor, moves: Move[]): void {
  for (const rule of CASTLES[color]) {
    if (!position.castling[rule.right]) continue;

    // Rights should imply the rook is home, but a hand-written FEN can lie.
    const rook = position.board[rule.rook];
    if (rook?.type !== 'r' || rook.color !== color) continue;

    if (rule.empty.some((square) => position.board[square])) continue;
    if (rule.safe.some((square) => isSquareAttacked(position, square, opponent(color)))) continue;

    moves.push(makeMove(rule.king, rule.to, 'k', undefined, undefined, ['quiet', rule.flag]));
  }
}

function generatePiece(position: Position, from: Square, piece: Piece, moves: Move[]): void {
  if (piece.type === 'p') {
    generatePawn(position, from, piece.color, moves);
    return;
  }

  const range = SLIDING.includes(piece.type) ? 7 : 1;

  for (const direction of DIRECTIONS[piece.type]) {
    let at = toCoords(from);

    for (let taken = 0; taken < range; taken += 1) {
      at = step(at, direction);
      const to = toSquare(at);
      if (!to) break;

      const occupant = position.board[to];
      if (!occupant) {
        moves.push(makeMove(from, to, piece.type, undefined, undefined, ['quiet']));
        continue;
      }

      // The ray ends at the first piece either way; it is only a destination
      // if that piece is an enemy.
      if (occupant.color !== piece.color) {
        moves.push(makeMove(from, to, piece.type, occupant.type, undefined, ['capture']));
      }
      break;
    }
  }

  if (piece.type === 'k') generateCastles(position, piece.color, moves);
}

/**
 * Every move the geometry allows, before asking whether it is legal. Exported
 * for tests; callers want `legalMoves`.
 */
export function pseudoLegalMoves(position: Position): Move[] {
  const moves: Move[] = [];

  for (const square of ALL_SQUARES) {
    const piece = position.board[square];
    if (piece?.color === position.turn) generatePiece(position, square, piece, moves);
  }

  return moves;
}

/** Every legal move for the side to move, in ascending order of origin square. */
export function legalMoves(position: Position): Move[] {
  return pseudoLegalMoves(position).filter(
    (move) => !isInCheck(applyMove(position, move), position.turn),
  );
}

/** The legal moves of the piece on `from`. `[]` if it is empty or not yours. */
export function legalMovesFrom(position: Position, from: Square): Move[] {
  // Validates the square name, so a typo throws rather than silently returning [].
  toCoords(from);

  return legalMoves(position).filter((move) => move.from === from);
}
