import { describe, expect, it } from 'vitest';
import type { Square } from '@chess/shared';
import { parseFen, STARTING_FEN } from '../fen.js';
import { legalMoves, legalMovesFrom, pseudoLegalMoves } from '../moves.js';
import { moveKey } from '../perft.js';
import { InvalidSquareError } from '../board.js';

/** Destination squares for one piece, deduplicated so promotions read as one. */
function movesFrom(fen: string, from: Square): string[] {
  return [...new Set(legalMovesFrom(parseFen(fen), from).map((move) => move.to))].sort();
}

/** Every legal move as `e2e4` / `a7a8q`, sorted. */
function allMoves(fen: string): string[] {
  return legalMoves(parseFen(fen)).map(moveKey).sort();
}

describe('the starting position', () => {
  it('still gives each side exactly 20 moves', () => {
    expect(legalMoves(parseFen(STARTING_FEN))).toHaveLength(20);
    expect(legalMoves(parseFen(STARTING_FEN.replace(' w ', ' b ')))).toHaveLength(20);
  });
});

describe('geometry', () => {
  it('walks a rook along its rank and file', () => {
    expect(movesFrom('7k/8/8/8/3R4/8/8/K7 w - - 0 1', 'd4')).toEqual([
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

  it('gives a knight on a1 exactly b3 and c2', () => {
    expect(movesFrom('7k/8/8/8/4K3/8/8/N7 w - - 0 1', 'a1')).toEqual(['b3', 'c2']);
  });

  it('gives a king on a1 exactly a2, b1 and b2', () => {
    expect(movesFrom('7k/8/8/8/8/8/8/K7 w - - 0 1', 'a1')).toEqual(['a2', 'b1', 'b2']);
  });

  it('gives a knight on d4 all eight destinations', () => {
    expect(movesFrom('7k/8/8/8/3N4/8/8/K7 w - - 0 1', 'd4')).toEqual([
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
});

describe('captures', () => {
  it('ends a rook ray on an enemy piece and includes it', () => {
    const moves = legalMovesFrom(parseFen('7k/8/8/8/p7/8/8/R5K1 w - - 0 1'), 'a1');
    const upTheFile = moves.filter((move) => move.to.startsWith('a'));

    expect(upTheFile.map((move) => move.to)).toEqual(['a2', 'a3', 'a4']);
    expect(upTheFile.at(-1)).toMatchObject({ to: 'a4', captured: 'p', flags: ['capture'] });
  });

  it('ends a rook ray before a friendly piece and excludes it', () => {
    const moves = movesFrom('7k/8/8/8/P7/8/8/R5K1 w - - 0 1', 'a1');

    expect(moves.filter((square) => square.startsWith('a'))).toEqual(['a2', 'a3']);
  });

  it('lets a knight land on an enemy but not a friend', () => {
    expect(movesFrom('7k/8/8/8/8/1p6/8/N5K1 w - - 0 1', 'a1')).toEqual(['b3', 'c2']);
    expect(movesFrom('7k/8/8/8/8/1P6/8/N5K1 w - - 0 1', 'a1')).toEqual(['c2']);
  });

  it('captures with a pawn only diagonally, and only onto an enemy', () => {
    expect(movesFrom('7k/8/8/8/2p1p3/3P4/8/K7 w - - 0 1', 'd3')).toEqual(['c4', 'd4', 'e4']);
    // The same diagonals, empty: a pawn covers them but cannot move there.
    expect(movesFrom('7k/8/8/8/8/3P4/8/K7 w - - 0 1', 'd3')).toEqual(['d4']);
    // Nor onto a friendly piece.
    expect(movesFrom('7k/8/8/8/2P1P3/3P4/8/K7 w - - 0 1', 'd3')).toEqual(['d4']);
  });

  it('still blocks a pawn push with a piece of either colour', () => {
    expect(movesFrom('7k/8/8/8/8/3p4/3P4/K7 w - - 0 1', 'd2')).toEqual([]);
    expect(movesFrom('7k/8/8/8/8/3P4/3P4/K7 w - - 0 1', 'd2')).toEqual([]);
    // The double step goes too, not just the single one.
    expect(movesFrom('7k/8/8/8/3p4/8/3P4/K7 w - - 0 1', 'd2')).toEqual(['d3']);
  });
});

describe('promotion', () => {
  it('generates four moves for a promoting push', () => {
    const moves = legalMovesFrom(parseFen('7k/P7/8/8/8/8/8/K7 w - - 0 1'), 'a7');

    expect(moves.map(moveKey)).toEqual(['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r']);
    expect(moves.every((move) => move.flags.includes('promotion'))).toBe(true);
  });

  it('generates four more for a promoting capture', () => {
    const moves = legalMovesFrom(parseFen('1n5k/P7/8/8/8/8/8/K7 w - - 0 1'), 'a7');

    expect(moves.map(moveKey)).toEqual([
      'a7a8b',
      'a7a8n',
      'a7a8q',
      'a7a8r',
      'a7b8b',
      'a7b8n',
      'a7b8q',
      'a7b8r',
    ]);
    expect(moves.filter((move) => move.captured === 'n')).toHaveLength(4);
  });
});

describe('castling', () => {
  const both = '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1';

  it('offers both castles when nothing is in the way', () => {
    expect(movesFrom(both, 'e1')).toEqual(['c1', 'd1', 'd2', 'e2', 'f1', 'f2', 'g1']);
  });

  it('is refused when the right is gone', () => {
    expect(movesFrom('4k3/8/8/8/8/8/8/R3K2R w - - 0 1', 'e1')).toEqual([
      'd1',
      'd2',
      'e2',
      'f1',
      'f2',
    ]);
  });

  it('is refused queenside when b1 is occupied', () => {
    expect(movesFrom('4k3/8/8/8/8/8/8/RN2K3 w Q - 0 1', 'e1')).not.toContain('c1');
  });

  // b1 must be empty but need not be safe: the king never stands on it.
  it('is allowed queenside when b1 is empty but attacked', () => {
    expect(movesFrom('4k3/8/8/8/8/8/1r6/R3K3 w Q - 0 1', 'e1')).toContain('c1');
  });

  it('is refused when the king would cross an attacked square', () => {
    expect(movesFrom('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1', 'e1')).not.toContain('g1');
    expect(movesFrom('4k3/8/8/8/8/8/3r4/R3K2R w KQ - 0 1', 'e1')).not.toContain('c1');
  });

  it('is refused out of check, and refused into one', () => {
    expect(movesFrom('4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1', 'e1')).toEqual(['d1', 'e2', 'f1']);
    expect(movesFrom('4k3/8/8/8/8/8/6r1/R3K2R w KQ - 0 1', 'e1')).not.toContain('g1');
  });

  it('is refused when the rook is not on its home square', () => {
    expect(movesFrom('4k3/8/8/8/8/8/8/4K2R w KQ - 0 1', 'e1')).not.toContain('c1');
  });
});

describe('legality by simulation', () => {
  it('will not move a pinned piece off the pinning ray', () => {
    // White knight d2 is pinned to the king by the rook on d8.
    const moves = movesFrom('3rk3/8/8/8/8/8/3N4/3K4 w - - 0 1', 'd2');

    expect(moves).toEqual([]);
  });

  it('lets a pinned piece move along the ray', () => {
    // The rook on d2 is pinned but may slide up and down the same file.
    expect(movesFrom('3rk3/8/8/8/8/8/3R4/3K4 w - - 0 1', 'd2')).toEqual([
      'd3',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
    ]);
  });

  it('refuses the square behind the king on a checking ray', () => {
    // The classic bug: the king "escapes" backwards to a square the rook still
    // covers, because its own old square masked the ray in the scan.
    const moves = allMoves('8/8/8/4k3/8/8/8/K3R3 b - - 0 1');

    expect(moves).not.toContain('e5e6');
    expect(moves).not.toContain('e5e4');
    expect(moves).toEqual(['e5d4', 'e5d5', 'e5d6', 'e5f4', 'e5f5', 'e5f6']);
  });

  it('allows only king moves out of double check', () => {
    // Rook e1 and bishop h8 both check; capturing one leaves the other.
    const moves = allMoves('r6B/8/8/4k3/8/8/8/K3R3 b - - 0 1');

    expect(moves).toEqual(['e5d5', 'e5d6', 'e5f4', 'e5f5']);
    expect(moves).not.toContain('a8h8');
  });

  it('allows exactly the blocks, the capture of the checker, and king moves', () => {
    const moves = allMoves('4k3/8/8/8/r7/8/8/r3RK2 b - - 0 1');

    expect(moves).toEqual(['a1e1', 'a4e4', 'e8d7', 'e8d8', 'e8f7', 'e8f8']);
  });

  it('never lets the two kings stand adjacent', () => {
    const moves = allMoves('8/8/8/3k4/8/3K4/8/8 w - - 0 1');

    expect(moves).toEqual(['d3c2', 'd3c3', 'd3d2', 'd3e2', 'd3e3']);
    for (const adjacent of ['d3c4', 'd3d4', 'd3e4']) {
      expect(moves).not.toContain(adjacent);
    }
  });

  it('generates pseudo-legal moves that legality then rejects', () => {
    const pinned = parseFen('3rk3/8/8/8/8/8/3N4/3K4 w - - 0 1');

    expect(pseudoLegalMoves(pinned).some((move) => move.from === 'd2')).toBe(true);
    expect(legalMoves(pinned).some((move) => move.from === 'd2')).toBe(false);
  });
});

describe('the contract', () => {
  it('returns [] from an empty square or an enemy piece', () => {
    expect(legalMovesFrom(parseFen(STARTING_FEN), 'e4')).toEqual([]);
    expect(legalMovesFrom(parseFen(STARTING_FEN), 'e7')).toEqual([]);
  });

  it('throws InvalidSquareError for a name that is not a square', () => {
    for (const bad of ['', 'a', 'a9', 'i1', 'A1']) {
      expect(() => legalMovesFrom(parseFen(STARTING_FEN), bad as Square)).toThrow(
        InvalidSquareError,
      );
    }
  });

  it('never returns a move that leaves its own king in check', () => {
    // Every move of every test position, checked the long way round.
    for (const fen of [
      STARTING_FEN,
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    ]) {
      const position = parseFen(fen);
      for (const move of legalMoves(position)) {
        expect(move.from).not.toBe(move.to);
        expect(position.board[move.from]?.color).toBe(position.turn);
      }
    }
  });
});
