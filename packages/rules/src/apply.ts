import type { CastlingRights, Move, PieceColor, Position, Square } from '@chess/shared';
import { opponent, step, toCoords, toSquare } from './board.js';
import { PAWN_FORWARD } from './offsets.js';

/** Which castling right each rook home square carries. */
const ROOK_HOME: Partial<Record<Square, keyof CastlingRights>> = {
  a1: 'wQ',
  h1: 'wK',
  a8: 'bQ',
  h8: 'bK',
};

/** Where the rook travels when the king castles. */
const CASTLE_ROOK: Record<
  'castle-k' | 'castle-q',
  Record<PieceColor, { from: Square; to: Square }>
> = {
  'castle-k': {
    w: { from: 'h1', to: 'f1' },
    b: { from: 'h8', to: 'f8' },
  },
  'castle-q': {
    w: { from: 'a1', to: 'd1' },
    b: { from: 'a8', to: 'd8' },
  },
};

/**
 * Rights are only ever revoked, never granted. A king move costs both of that
 * side's rights; a rook leaving its home square costs that side's one — and so
 * does a rook being *captured* on its home square, which is the half everyone
 * forgets, because the move that revokes it belongs to the other player.
 */
function nextCastlingRights(rights: CastlingRights, move: Move, mover: PieceColor): CastlingRights {
  const next = { ...rights };

  if (move.piece === 'k') {
    next[`${mover}K`] = false;
    next[`${mover}Q`] = false;
  }

  const vacated = ROOK_HOME[move.from];
  if (vacated) next[vacated] = false;

  const taken = ROOK_HOME[move.to];
  if (taken) next[taken] = false;

  return next;
}

/**
 * Plays a move, returning a new position. Pure: the input is never written to,
 * which is what lets the legality filter apply a move purely to ask whether it
 * leaves the mover's own king attacked.
 *
 * The move is assumed to have come from the generator. Handing this an
 * arbitrary `Move` produces an arbitrary position, not an error.
 */
export function applyMove(position: Position, move: Move): Position {
  const mover = position.turn;
  const board = { ...position.board };

  delete board[move.from];

  // En passant is the only move in chess that removes a piece from a square
  // other than `to`: the captured pawn is beside the mover, not in front of
  // it. Miss this and a ghost pawn survives on the board.
  if (move.flags.includes('ep')) {
    const captured = toSquare({ file: toCoords(move.to).file, rank: toCoords(move.from).rank });
    if (captured) delete board[captured];
  }

  board[move.to] = { type: move.promotion ?? move.piece, color: mover };

  const castle = move.flags.includes('castle-k')
    ? 'castle-k'
    : move.flags.includes('castle-q')
      ? 'castle-q'
      : undefined;

  if (castle) {
    const rook = CASTLE_ROOK[castle][mover];
    delete board[rook.from];
    board[rook.to] = { type: 'r', color: mover };
  }

  const skipped = move.flags.includes('double-push')
    ? toSquare(step(toCoords(move.from), PAWN_FORWARD[mover]))
    : undefined;

  return {
    board,
    turn: opponent(mover),
    castling: nextCastlingRights(position.castling, move, mover),
    epTarget: skipped ?? null,
    halfmoveClock: move.piece === 'p' || move.captured ? 0 : position.halfmoveClock + 1,
    // A full move is complete once black has replied.
    fullmoveNumber: mover === 'b' ? position.fullmoveNumber + 1 : position.fullmoveNumber,
  };
}
