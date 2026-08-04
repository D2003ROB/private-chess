import { describe, expect, it } from 'vitest';
import { isInCheck } from '../attacks.js';
import { parseFen, positionKey, STARTING_FEN } from '../fen.js';
import { gameStatus } from '../status.js';

const status = (fen: string, history?: string[]) => gameStatus(parseFen(fen), history);

describe('isInCheck', () => {
  it('is false in the starting position and true under attack', () => {
    expect(isInCheck(parseFen(STARTING_FEN))).toBe(false);
    expect(isInCheck(parseFen('4k3/8/8/8/8/8/8/4KR2 b - - 0 1'))).toBe(false);
    expect(isInCheck(parseFen('4k3/8/8/8/8/8/8/4K1R1 b - - 0 1'))).toBe(false);
    expect(isInCheck(parseFen('4k3/4R3/8/8/8/8/8/4K3 b - - 0 1'))).toBe(true);
  });

  it('answers for whichever side is asked, not only the side to move', () => {
    const position = parseFen('4k3/4R3/8/8/8/8/8/4K3 w - - 0 1');

    expect(isInCheck(position)).toBe(false);
    expect(isInCheck(position, 'b')).toBe(true);
  });
});

describe('gameStatus', () => {
  it('reports play, with the check flag set when in check', () => {
    expect(status(STARTING_FEN)).toEqual({ state: 'playing', check: false });
    expect(status('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1')).toEqual({ state: 'playing', check: true });
  });

  it('reports checkmate with the winner', () => {
    // Back-rank mate: the rook checks along the first rank, the pawns block.
    expect(status('6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1')).toEqual({ state: 'playing', check: false });
    expect(status('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1')).toEqual({
      state: 'checkmate',
      winner: 'w',
    });
    expect(status('4k3/8/8/8/8/8/5PPP/r5K1 w - - 0 1')).toEqual({
      state: 'checkmate',
      winner: 'b',
    });
  });

  it('reports stalemate, which differs from mate only by the check', () => {
    expect(status('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toEqual({ state: 'stalemate' });
  });

  it('reports the fifty-move draw in plies', () => {
    expect(status('4k3/8/8/8/8/8/4P3/4K3 w - - 99 60')).toEqual({ state: 'playing', check: false });
    expect(status('4k3/8/8/8/8/8/4P3/4K3 w - - 100 60')).toEqual({
      state: 'draw',
      reason: 'fifty-move',
    });
  });

  describe('insufficient material', () => {
    it('draws on bare kings and a lone minor', () => {
      expect(status('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual({
        state: 'draw',
        reason: 'insufficient-material',
      });
      expect(status('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1')).toEqual({
        state: 'draw',
        reason: 'insufficient-material',
      });
      expect(status('4k3/8/8/8/8/8/8/1N2K3 w - - 0 1')).toEqual({
        state: 'draw',
        reason: 'insufficient-material',
      });
    });

    it('draws on one bishop each, same square colour', () => {
      // c1 and f8 are both dark.
      expect(status('4kb2/8/8/8/8/8/8/2B1K3 w - - 0 1')).toEqual({
        state: 'draw',
        reason: 'insufficient-material',
      });
    });

    it('plays on with bishops of opposite square colour', () => {
      expect(status('2b1k3/8/8/8/8/8/8/2B1K3 w - - 0 1')).toEqual({
        state: 'playing',
        check: false,
      });
    });

    it('plays on with two knights, which is not an automatic draw', () => {
      expect(status('8/8/8/4k3/8/8/8/KNN5 w - - 0 1')).toEqual({ state: 'playing', check: false });
    });

    it('plays on with anything that can mate alone', () => {
      expect(status('4k3/8/8/8/8/8/8/R3K3 w - - 0 1')).toEqual({ state: 'playing', check: false });
      expect(status('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')).toEqual({ state: 'playing', check: false });
    });
  });

  describe('threefold repetition', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 4 20';
    const key = positionKey(parseFen(fen));

    it('draws on the third occurrence of the position', () => {
      expect(status(fen, [key, key])).toEqual({ state: 'playing', check: false });
      expect(status(fen, [key, key, key])).toEqual({ state: 'draw', reason: 'threefold' });
    });

    it('is skipped rather than guessed at when no history is given', () => {
      expect(status(fen)).toEqual({ state: 'playing', check: false });
    });

    it('does not count positions that merely share a board', () => {
      // Same pieces, other side to move: a different position entirely.
      const other = positionKey(parseFen('4k3/8/8/8/8/8/4P3/4K3 b - - 4 20'));

      expect(status(fen, [other, other, other])).toEqual({ state: 'playing', check: false });
    });
  });
});
