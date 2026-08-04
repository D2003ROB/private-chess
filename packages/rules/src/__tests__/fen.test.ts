import { describe, expect, it } from 'vitest';
import { InvalidFenError, parseFen, positionKey, STARTING_FEN, toFen } from '../fen.js';
import { PERFT_POSITIONS } from './positions.js';

describe('parseFen', () => {
  it('reads the six fields of the starting position', () => {
    const position = parseFen(STARTING_FEN);

    expect(position.board['e1']).toEqual({ type: 'k', color: 'w' });
    expect(position.board['d8']).toEqual({ type: 'q', color: 'b' });
    expect(position.board['e4']).toBeUndefined();
    expect(Object.keys(position.board)).toHaveLength(32);
    expect(position.turn).toBe('w');
    expect(position.castling).toEqual({ wK: true, wQ: true, bK: true, bQ: true });
    expect(position.epTarget).toBeNull();
    expect(position.halfmoveClock).toBe(0);
    expect(position.fullmoveNumber).toBe(1);
  });

  it('reads partial castling rights and an en-passant target', () => {
    const position = parseFen('4k3/8/8/8/4pP2/8/8/4K3 b Kq f3 3 27');

    expect(position.castling).toEqual({ wK: true, wQ: false, bK: false, bQ: true });
    expect(position.epTarget).toBe('f3');
    expect(position.halfmoveClock).toBe(3);
    expect(position.fullmoveNumber).toBe(27);
  });

  it('names the offending field when the record is malformed', () => {
    const cases: [string, string][] = [
      ['8/8/8/8/8/8/8/8 w - -', 'record'],
      ['8/8/8/8/8/8/8 w - - 0 1', 'board'],
      ['8/8/8/8/8/8/8/8/8 w - - 0 1', 'board'],
      ['9/8/8/8/8/8/8/8 w - - 0 1', 'board'],
      ['8/8/8/8/8/8/8/7 w - - 0 1', 'board'],
      ['rnbqkbnx/8/8/8/8/8/8/8 w - - 0 1', 'board'],
      ['8/8/8/8/8/8/8/8 x - - 0 1', 'turn'],
      ['8/8/8/8/8/8/8/8 w XQ - 0 1', 'castling'],
      ['8/8/8/8/8/8/8/8 w - e9 0 1', 'epTarget'],
      ['8/8/8/8/8/8/8/8 w - - x 1', 'halfmoveClock'],
      ['8/8/8/8/8/8/8/8 w - - 0 -1', 'fullmoveNumber'],
    ];

    for (const [fen, field] of cases) {
      expect(() => parseFen(fen), fen).toThrow(InvalidFenError);
      expect(() => parseFen(fen), fen).toThrow(new RegExp(`Invalid FEN ${field}`));
    }
  });
});

describe('toFen', () => {
  it('rebuilds the starting record exactly', () => {
    expect(toFen(parseFen(STARTING_FEN))).toBe(STARTING_FEN);
  });

  it('round-trips every perft position', () => {
    for (const { fen } of PERFT_POSITIONS) {
      expect(toFen(parseFen(fen))).toBe(fen);
      expect(parseFen(toFen(parseFen(fen)))).toEqual(parseFen(fen));
    }
  });

  it('writes a dash for absent rights and en-passant target', () => {
    expect(toFen(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'))).toBe('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  });
});

describe('positionKey', () => {
  it('ignores the clocks, so a repetition is recognised across them', () => {
    expect(positionKey(parseFen(STARTING_FEN))).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
    );
    expect(positionKey(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'))).toBe(
      positionKey(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 44 90')),
    );
  });

  it('separates positions that differ only in castling rights', () => {
    expect(positionKey(parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'))).not.toBe(
      positionKey(parseFen('r3k2r/8/8/8/8/8/8/R3K2R w Kkq - 0 1')),
    );
  });
});
