import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FILES, RANKS, STARTING_LAYOUT } from '@chess/shared';
import type { Board, PieceColor, PieceType, Square } from '@chess/shared';
import { InvalidSquareError } from '../board.js';
import { movesFor } from '../moves.js';

/** `position({ a1: 'wr', a4: 'bp' })` — terser than repeating object literals. */
function position(entries: Record<string, `${PieceColor}${PieceType}`>): Board {
  const board: Board = {};
  for (const [square, code] of Object.entries(entries)) {
    board[square as Square] = {
      color: code[0] as PieceColor,
      type: code[1] as PieceType,
    };
  }
  return board;
}

const ALL_SQUARES: Square[] = FILES.flatMap((file) =>
  RANKS.map((rank) => `${file}${rank}` as Square),
);

function totalMoves(board: Board, color: PieceColor): number {
  return ALL_SQUARES.filter((square) => board[square]?.color === color).reduce(
    (total, square) => total + movesFor(board, square).length,
    0,
  );
}

describe('the starting position', () => {
  // The single most valuable test in the file: sixteen pawn moves plus four
  // knight moves, everything else blocked. If this is not 20 the geometry is
  // broken, whatever the narrower vectors say.
  it('gives white exactly 20 moves', () => {
    expect(totalMoves(STARTING_LAYOUT, 'w')).toBe(20);
  });

  it('gives black exactly 20 moves', () => {
    expect(totalMoves(STARTING_LAYOUT, 'b')).toBe(20);
  });

  it('leaves every piece but the pawns and knights with nothing to do', () => {
    for (const square of ['a1', 'c1', 'd1', 'e1', 'f1', 'h1'] as Square[]) {
      expect(movesFor(STARTING_LAYOUT, square)).toEqual([]);
    }
  });

  it('gives each knight two moves', () => {
    expect(movesFor(STARTING_LAYOUT, 'b1')).toEqual(['a3', 'c3']);
    expect(movesFor(STARTING_LAYOUT, 'g1')).toEqual(['f3', 'h3']);
  });
});

describe('sliding pieces', () => {
  it('walks a rook along ranks and files', () => {
    expect(movesFor(position({ d4: 'wr' }), 'd4')).toEqual([
      'a4',
      'b4',
      'c4',
      'd1',
      'd2',
      'd3',
      'd5',
      'd6',
      'd7',
      'd8',
      'e4',
      'f4',
      'g4',
      'h4',
    ]);
  });

  it('walks a bishop along diagonals', () => {
    expect(movesFor(position({ c1: 'wb' }), 'c1')).toEqual([
      'a3',
      'b2',
      'd2',
      'e3',
      'f4',
      'g5',
      'h6',
    ]);
  });

  it('gives a queen the union of both', () => {
    const empty = position({ d4: 'wq' });
    const rookMoves = movesFor(position({ d4: 'wr' }), 'd4');
    const bishopMoves = movesFor(position({ d4: 'wb' }), 'd4');

    expect(movesFor(empty, 'd4')).toEqual([...rookMoves, ...bishopMoves].sort());
    expect(movesFor(empty, 'd4')).toHaveLength(27);
  });

  it('gives a corner rook 14 squares and a corner bishop 7', () => {
    expect(movesFor(position({ a1: 'wr' }), 'a1')).toHaveLength(14);
    expect(movesFor(position({ a1: 'wb' }), 'a1')).toHaveLength(7);
  });
});

describe('stepping pieces', () => {
  it('gives a knight on a1 exactly b3 and c2', () => {
    expect(movesFor(position({ a1: 'wn' }), 'a1')).toEqual(['b3', 'c2']);
  });

  it('gives a king on a1 exactly a2, b1 and b2', () => {
    expect(movesFor(position({ a1: 'wk' }), 'a1')).toEqual(['a2', 'b1', 'b2']);
  });

  it('gives a knight on d4 all eight destinations', () => {
    expect(movesFor(position({ d4: 'wn' }), 'd4')).toEqual([
      'b3',
      'b5',
      'c2',
      'c6',
      'e2',
      'e6',
      'f3',
      'f5',
    ]);
  });

  it('gives a king on d4 all eight neighbours', () => {
    expect(movesFor(position({ d4: 'wk' }), 'd4')).toEqual([
      'c3',
      'c4',
      'c5',
      'd3',
      'd5',
      'e3',
      'e4',
      'e5',
    ]);
  });
});

describe('blocking', () => {
  it('stops a rook short of an occupied square, whatever colour occupies it', () => {
    // The ticket states this vector as "rook a1, blocker a4 -> a2, a3", which
    // is the a-file ray. The rook is alone on rank 1 as well, so it also runs
    // east; asserting the ray is the faithful reading of the vector.
    const blockedByWhite = movesFor(position({ a1: 'wr', a4: 'wp' }), 'a1');
    const blockedByBlack = movesFor(position({ a1: 'wr', a4: 'bp' }), 'a1');

    expect(blockedByWhite.filter((square) => square.startsWith('a'))).toEqual(['a2', 'a3']);
    expect(blockedByBlack).toEqual(blockedByWhite);
    expect(blockedByWhite).toEqual(['a2', 'a3', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1']);
  });

  it('never includes the occupied square itself — a capture is out of scope', () => {
    expect(movesFor(position({ a1: 'wr', a4: 'bp' }), 'a1')).not.toContain('a4');
  });

  it('closes a bishop diagonal with a piece on the first square of it', () => {
    const moves = movesFor(position({ c1: 'wb', d2: 'wp' }), 'c1');

    expect(moves).toEqual(['a3', 'b2']);
    for (const blocked of ['d2', 'e3', 'f4', 'g5', 'h6']) {
      expect(moves).not.toContain(blocked);
    }
  });

  it('lets a knight jump over its neighbours', () => {
    expect(movesFor(position({ b1: 'wn', a3: 'wp', c3: 'wp' }), 'b1')).toEqual(['d2']);
  });

  it('leaves a knight with nothing when every destination is occupied', () => {
    expect(movesFor(position({ b1: 'wn', a3: 'wp', c3: 'wp', d2: 'wp' }), 'b1')).toEqual([]);
  });
});

describe('pawns', () => {
  it('offers one or two squares from the starting rank', () => {
    expect(movesFor(position({ a2: 'wp' }), 'a2')).toEqual(['a3', 'a4']);
    expect(movesFor(position({ h7: 'bp' }), 'h7')).toEqual(['h5', 'h6']);
  });

  it('offers one square once it has moved', () => {
    expect(movesFor(position({ a3: 'wp' }), 'a3')).toEqual(['a4']);
    expect(movesFor(position({ h6: 'bp' }), 'h6')).toEqual(['h5']);
  });

  it('moves towards the opponent, never backwards', () => {
    expect(movesFor(position({ d4: 'wp' }), 'd4')).toEqual(['d5']);
    expect(movesFor(position({ d5: 'bp' }), 'd5')).toEqual(['d4']);
  });

  it('is stopped dead by a piece directly in front, double step included', () => {
    expect(movesFor(position({ a2: 'wp', a3: 'bp' }), 'a2')).toEqual([]);
    expect(movesFor(position({ h7: 'bp', h6: 'wp' }), 'h7')).toEqual([]);
  });

  it('keeps the single step when only the double step is blocked', () => {
    expect(movesFor(position({ a2: 'wp', a4: 'bp' }), 'a2')).toEqual(['a3']);
    expect(movesFor(position({ h7: 'bp', h5: 'wp' }), 'h7')).toEqual(['h6']);
  });

  it('has nowhere to go from the far rank', () => {
    expect(movesFor(position({ a8: 'wp' }), 'a8')).toEqual([]);
    expect(movesFor(position({ a1: 'bp' }), 'a1')).toEqual([]);
  });

  it('never moves diagonally — a capture is out of scope', () => {
    const moves = movesFor(position({ d4: 'wp', c5: 'bp', e5: 'bp' }), 'd4');

    expect(moves).toEqual(['d5']);
  });
});

describe('the contract', () => {
  it('returns [] for an empty square', () => {
    expect(movesFor(STARTING_LAYOUT, 'e4')).toEqual([]);
    expect(movesFor({}, 'a1')).toEqual([]);
  });

  it('throws InvalidSquareError for a name that is not a square', () => {
    for (const bad of ['', 'a', 'a9', 'i1', 'a10', 'A1', '1a', 'e4 ']) {
      expect(() => movesFor(STARTING_LAYOUT, bad as Square)).toThrow(InvalidSquareError);
    }
  });

  it('validates the square before looking at the board', () => {
    expect(() => movesFor({}, 'z9' as Square)).toThrow(InvalidSquareError);
  });

  it('returns squares sorted ascending, with no duplicates', () => {
    for (const square of ALL_SQUARES) {
      const moves = movesFor(STARTING_LAYOUT, square);

      expect(moves).toEqual([...moves].sort());
      expect(new Set(moves).size).toBe(moves.length);
    }
  });

  it('never returns an off-board square or the origin', () => {
    // Every piece type from every square, so no corner of the geometry is
    // exercised only by the positions the other tests happen to pick.
    const types: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];

    for (const from of ALL_SQUARES) {
      for (const type of types) {
        for (const color of ['w', 'b'] as PieceColor[]) {
          const moves = movesFor({ ...STARTING_LAYOUT, [from]: { type, color } }, from);

          for (const to of moves) {
            expect(ALL_SQUARES).toContain(to);
            expect(to).not.toBe(from);
          }
        }
      }
    }
  });

  it('returns equal arrays when called twice', () => {
    expect(movesFor(STARTING_LAYOUT, 'b1')).toEqual(movesFor(STARTING_LAYOUT, 'b1'));
    expect(movesFor(STARTING_LAYOUT, 'b1')).not.toBe(movesFor(STARTING_LAYOUT, 'b1'));
  });

  it('leaves the board deeply unchanged', () => {
    const before = structuredClone(STARTING_LAYOUT);

    for (const square of ALL_SQUARES) movesFor(STARTING_LAYOUT, square);

    expect(STARTING_LAYOUT).toEqual(before);
  });
});

describe('packaging', () => {
  // The API will import this package, so it must never drag a dependency —
  // Zod included — into the server. Enforced here rather than left to review,
  // because a plain `import { FILES }` would look harmless in a diff.
  it('imports nothing at runtime: every cross-package import is type-only', () => {
    const src = fileURLToPath(new URL('../', import.meta.url));
    const sources = readdirSync(src).filter((entry) => entry.endsWith('.ts'));
    const statements = /^import\s+(?:type\s+)?[^;]*?from\s+'([^']+)';/gm;

    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      for (const [statement, specifier] of readFileSync(src + file, 'utf8').matchAll(statements)) {
        if (specifier?.startsWith('.')) continue;
        expect(`${file}: ${statement}`).toMatch(/: import type /);
      }
    }
  });
});
