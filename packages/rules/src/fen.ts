import type {
  Board,
  CastlingRights,
  Piece,
  PieceColor,
  PieceType,
  Position,
  Square,
} from '@chess/shared';
import { isSquare, toSquare } from './board.js';

/**
 * Forsyth-Edwards Notation, both directions.
 *
 * This exists ahead of any UI need because the test suite is written in FEN:
 * every published test position in chess is distributed as one, and without a
 * parser the perft fixtures would be unmaintainable object literals.
 */

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Thrown by `parseFen`, naming the field that was wrong. */
export class InvalidFenError extends Error {
  readonly field: string;

  constructor(field: string, detail: string) {
    super(`Invalid FEN ${field}: ${detail}`);
    this.name = 'InvalidFenError';
    this.field = field;
  }
}

const PIECE_LETTERS: Record<string, PieceType> = {
  k: 'k',
  q: 'q',
  r: 'r',
  b: 'b',
  n: 'n',
  p: 'p',
};

/** `{ type: 'n', color: 'w' }` -> `N`. Black is lower case. */
function toLetter({ type, color }: Piece): string {
  return color === 'w' ? type.toUpperCase() : type;
}

function parseBoard(field: string): Board {
  const rows = field.split('/');
  if (rows.length !== 8) {
    throw new InvalidFenError('board', `expected 8 ranks, got ${rows.length}`);
  }

  const board: Board = {};

  rows.forEach((row, index) => {
    // FEN writes rank 8 first, so the row index counts down from the top.
    const rank = 7 - index;
    let file = 0;

    for (const character of row) {
      const skip = Number.parseInt(character, 10);

      if (Number.isNaN(skip)) {
        const type = PIECE_LETTERS[character.toLowerCase()];
        const square = toSquare({ file, rank });
        if (!type || !square) {
          throw new InvalidFenError('board', `unexpected '${character}' in rank ${rank + 1}`);
        }
        const color: PieceColor = character === character.toUpperCase() ? 'w' : 'b';
        board[square] = { type, color };
        file += 1;
      } else {
        if (skip < 1 || skip > 8) {
          throw new InvalidFenError('board', `bad skip '${character}' in rank ${rank + 1}`);
        }
        file += skip;
      }
    }

    if (file !== 8) {
      throw new InvalidFenError('board', `rank ${rank + 1} covers ${file} files, not 8`);
    }
  });

  return board;
}

function parseCastling(field: string): CastlingRights {
  if (field !== '-' && !/^K?Q?k?q?$/.test(field)) {
    throw new InvalidFenError('castling', `expected '-' or a subset of KQkq, got '${field}'`);
  }

  return {
    wK: field.includes('K'),
    wQ: field.includes('Q'),
    bK: field.includes('k'),
    bQ: field.includes('q'),
  };
}

function parseCount(field: string, name: string): number {
  const value = Number(field);
  if (!/^\d+$/.test(field) || !Number.isSafeInteger(value)) {
    throw new InvalidFenError(name, `expected a non-negative integer, got '${field}'`);
  }
  return value;
}

/** Parses a full six-field FEN record. Throws `InvalidFenError` on anything else. */
export function parseFen(fen: string): Position {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) {
    throw new InvalidFenError('record', `expected 6 fields, got ${fields.length}`);
  }

  const [board, turn, castling, ep, halfmove, fullmove] = fields as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  if (turn !== 'w' && turn !== 'b') {
    throw new InvalidFenError('turn', `expected 'w' or 'b', got '${turn}'`);
  }

  if (ep !== '-' && !isSquare(ep)) {
    throw new InvalidFenError('epTarget', `expected '-' or a square, got '${ep}'`);
  }

  return {
    board: parseBoard(board),
    turn,
    castling: parseCastling(castling),
    epTarget: ep === '-' ? null : (ep as Square),
    halfmoveClock: parseCount(halfmove, 'halfmoveClock'),
    fullmoveNumber: parseCount(fullmove, 'fullmoveNumber'),
  };
}

function boardField(board: Board): string {
  const rows: string[] = [];

  // Rank 8 first, mirroring how FEN reads a board from black's back rank down.
  for (let rank = 7; rank >= 0; rank -= 1) {
    let row = '';
    let empty = 0;

    for (let file = 0; file < 8; file += 1) {
      const piece = board[toSquare({ file, rank }) as Square];
      if (piece) {
        row += (empty > 0 ? String(empty) : '') + toLetter(piece);
        empty = 0;
      } else {
        empty += 1;
      }
    }

    rows.push(empty > 0 ? row + String(empty) : row);
  }

  return rows.join('/');
}

function castlingField({ wK, wQ, bK, bQ }: CastlingRights): string {
  const field = `${wK ? 'K' : ''}${wQ ? 'Q' : ''}${bK ? 'k' : ''}${bQ ? 'q' : ''}`;
  return field === '' ? '-' : field;
}

/** The inverse of `parseFen`: `parseFen(toFen(p))` deep-equals `p`. */
export function toFen(position: Position): string {
  return [
    boardField(position.board),
    position.turn,
    castlingField(position.castling),
    position.epTarget ?? '-',
    String(position.halfmoveClock),
    String(position.fullmoveNumber),
  ].join(' ');
}

/**
 * Position identity for repetition detection: the first four FEN fields. The
 * clocks are excluded deliberately — two positions repeat when the pieces,
 * the side to move, the castling rights and the en-passant target agree.
 */
export function positionKey(position: Position): string {
  return toFen(position).split(' ').slice(0, 4).join(' ');
}
