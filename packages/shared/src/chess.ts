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
 * Which castles are still available. Set false by moving the king, moving the
 * rook, or having that rook captured on its home square — never restored.
 */
export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

/**
 * A complete position: everything needed to determine the legal moves, and
 * nothing more. The fields are exactly the six of a FEN record, which is not a
 * coincidence — `parseFen`/`toFen` in `@chess/rules` are the two directions of
 * the same mapping.
 *
 * A bare board cannot express castling rights or an en-passant target, and both
 * change which moves are legal, so a board on its own is not a position.
 */
export interface Position {
  board: Board;
  turn: PieceColor;
  castling: CastlingRights;
  /** The square a double-stepping pawn skipped over, not the pawn's square. */
  epTarget: Square | null;
  /** Plies since the last capture or pawn move. 100 is the fifty-move draw. */
  halfmoveClock: number;
  /** Incremented after black moves. */
  fullmoveNumber: number;
}

/** What a pawn may become. A king is not a choice, and neither is a pawn. */
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

/**
 * What happened, for the caller's benefit. `capture` and `ep` are disjoint;
 * `promotion` combines with either `quiet` or `capture`.
 */
export type MoveFlag =
  'quiet' | 'capture' | 'double-push' | 'ep' | 'castle-k' | 'castle-q' | 'promotion';

/**
 * A move, not merely a destination: promotion needs a chosen piece, and the UI
 * needs to know whether a square is a capture without diffing two boards.
 */
export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  /** The type taken, including the pawn taken en passant. */
  captured?: PieceType;
  promotion?: PromotionPiece;
  flags: MoveFlag[];
}
