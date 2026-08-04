import { describe, expect, it } from 'vitest';
import { fenTurn, parseBestMove, parseInfo, toWhitePerspective } from './uci';
import { formatScore, winPercent } from './evalDisplay';

describe('parseInfo', () => {
  it('reads a full info line', () => {
    const info = parseInfo(
      'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 143221 nps 812000 time 176 pv e2e4 e7e5 g1f3',
    );

    expect(info).toEqual({
      depth: 12,
      seldepth: 18,
      multipv: 1,
      nodes: 143221,
      nps: 812000,
      time: 176,
      score: { kind: 'cp', value: 34 },
      moves: ['e2e4', 'e7e5', 'g1f3'],
    });
  });

  it('defaults multipv to 1 when the engine omits it', () => {
    expect(parseInfo('info depth 4 score cp -12 pv d2d4')?.multipv).toBe(1);
  });

  it('reads a mate score as its own kind, not a huge centipawn value', () => {
    expect(parseInfo('info depth 8 multipv 1 score mate 2 pv h3g4 g1f2 g2g1q')?.score).toEqual({
      kind: 'mate',
      value: 2,
    });
    expect(parseInfo('info depth 8 score mate -3 pv a1a2')?.score).toEqual({
      kind: 'mate',
      value: -3,
    });
  });

  it('skips fields it does not know rather than rejecting the line', () => {
    // `hashfull` is absent from the protocol summary and present in the output.
    const info = parseInfo(
      'info depth 8 seldepth 11 multipv 1 score mate 2 nodes 1588 nps 158800 hashfull 1 time 10 pv h3g4',
    );

    expect(info?.score).toEqual({ kind: 'mate', value: 2 });
    expect(info?.moves).toEqual(['h3g4']);
  });

  it('handles a one-move pv and a thirty-move pv', () => {
    expect(parseInfo('info depth 1 score cp 5 pv e2e4')?.moves).toEqual(['e2e4']);

    const long = Array.from({ length: 30 }, (_, index) => `m${index}`);
    expect(parseInfo(`info depth 30 score cp 5 pv ${long.join(' ')}`)?.moves).toEqual(long);
  });

  it('returns null for lines carrying no score', () => {
    const ignored = [
      'info string NNUE evaluation using nn-9067e33176e8.nnue (11MiB, (22528, 256, 15, 32, 1))',
      'info string Network replica 1: Local memory.',
      'info depth 1 currmove e2e4 currmovenumber 1',
      'info depth 20 nodes 1000 nps 5000',
      'uciok',
      'bestmove e2e4',
      '',
    ];

    for (const line of ignored) expect(parseInfo(line), line).toBeNull();
  });

  it('returns null for malformed or truncated lines rather than throwing', () => {
    const broken = [
      'info depth 12 score cp',
      'info depth 12 score',
      'info depth 12 score cp abc pv e2e4',
      'info depth 12 score qq 40 pv e2e4',
      'info depth score cp 40',
      'info multipv score cp 40',
    ];

    for (const line of broken) {
      expect(() => parseInfo(line)).not.toThrow();
      expect(parseInfo(line), line).toBeNull();
    }
  });
});

describe('parseBestMove', () => {
  it('reads a move with and without a ponder', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({
      bestmove: 'e2e4',
      ponder: 'e7e5',
    });
    expect(parseBestMove('bestmove e2e4')).toEqual({ bestmove: 'e2e4', ponder: null });
  });

  it('reads `(none)` as a finished game, not as an error', () => {
    expect(parseBestMove('bestmove (none)')).toEqual({ bestmove: null, ponder: null });
  });

  it('returns null for anything else', () => {
    for (const line of ['info depth 1 score cp 4 pv e2e4', 'readyok', 'bestmove', '']) {
      expect(parseBestMove(line), line).toBeNull();
    }
  });
});

describe('perspective', () => {
  // The bug this integration exists to avoid: UCI reports from the side to
  // move, so a winning Black position reports positive on Black's turn.
  it('negates a Black-to-move score so everything downstream is White-relative', () => {
    expect(toWhitePerspective({ kind: 'cp', value: 250 }, 'b')).toEqual({
      kind: 'cp',
      value: -250,
    });
    expect(toWhitePerspective({ kind: 'mate', value: 3 }, 'b')).toEqual({
      kind: 'mate',
      value: -3,
    });
  });

  it('leaves a White-to-move score alone', () => {
    expect(toWhitePerspective({ kind: 'cp', value: 250 }, 'w')).toEqual({ kind: 'cp', value: 250 });
    expect(toWhitePerspective({ kind: 'mate', value: 3 }, 'w')).toEqual({
      kind: 'mate',
      value: 3,
    });
  });

  it('turns a Black-to-move `score cp 250` into a displayed −2.50', () => {
    const info = parseInfo('info depth 10 multipv 1 score cp 250 pv h3g4');
    if (!info) throw new Error('expected the line to parse');

    expect(formatScore(toWhitePerspective(info.score, 'b'))).toBe('−2.50');
    expect(formatScore(toWhitePerspective(info.score, 'w'))).toBe('+2.50');
  });

  it('reads the side to move off a FEN', () => {
    expect(fenTurn('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('w');
    expect(fenTurn('6k1/8/8/8/8/7q/6p1/6K1 b - - 0 1')).toBe('b');
  });
});

describe('display', () => {
  it('formats pawns with an explicit sign and two decimals', () => {
    expect(formatScore({ kind: 'cp', value: 34 })).toBe('+0.34');
    expect(formatScore({ kind: 'cp', value: -120 })).toBe('−1.20');
    expect(formatScore({ kind: 'cp', value: 0 })).toBe('0.00');
    expect(formatScore({ kind: 'cp', value: 1500 })).toBe('+15.00');
  });

  it('formats mate as M5 and −M3', () => {
    expect(formatScore({ kind: 'mate', value: 5 })).toBe('M5');
    expect(formatScore({ kind: 'mate', value: -3 })).toBe('−M3');
  });

  it('maps level to the middle and drives mate fully over', () => {
    expect(winPercent({ kind: 'cp', value: 0 })).toBeCloseTo(50, 5);
    expect(winPercent({ kind: 'mate', value: 1 })).toBe(100);
    expect(winPercent({ kind: 'mate', value: -1 })).toBe(0);
  });

  it('rises with the score and clamps beyond ±1000 centipawns', () => {
    expect(winPercent({ kind: 'cp', value: 100 })).toBeGreaterThan(
      winPercent({ kind: 'cp', value: 0 }),
    );
    expect(winPercent({ kind: 'cp', value: -100 })).toBeLessThan(
      winPercent({ kind: 'cp', value: 0 }),
    );
    // Winning is winning: +10 and +24 pawns look the same on a bar.
    expect(winPercent({ kind: 'cp', value: 2400 })).toBe(winPercent({ kind: 'cp', value: 1000 }));
    expect(winPercent({ kind: 'cp', value: 900 })).toBeLessThan(
      winPercent({ kind: 'cp', value: 1000 }),
    );
  });
});
