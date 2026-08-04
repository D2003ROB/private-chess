import { describe, expect, it } from 'vitest';
import type { Move } from '@chess/shared';
import { applyMove, legalMoves, moveKey, parseFen, STARTING_FEN } from '@chess/rules';
import { classify, winPercentFor, winPercentLoss, WINNING_WIN_PCT } from './classify';
import { moveAccuracy } from './accuracy';
import type { ClassifyInput } from './classify';
import type { PositionEval } from './types';
import type { Score as EngineScore } from '../engine';

/**
 * Built entirely on fixture evaluations, never a live engine. The classifier is
 * pure logic over numbers and needs dozens of iterations while thresholds are
 * tuned; waiting a minute for a real analysis between each would be unbearable.
 */

const cp = (value: number): EngineScore => ({ kind: 'cp', value });
const mate = (value: number): EngineScore => ({ kind: 'mate', value });

/** A `PositionEval` whose best line is `best` and whose second line is `second`. */
function evaluation(score: EngineScore, best = 'e2e4', second?: EngineScore): PositionEval {
  const lines = [{ multipv: 1, score, moves: [best] }];
  if (second) lines.push({ multipv: 2, score: second, moves: ['a2a3'] });

  return { fen: 'fixture', depth: 16, score, lines };
}

/** Finds a real, legal move so the classifier's board-aware tests have one. */
function moveIn(fen: string, from: string, to: string): Move {
  const position = parseFen(fen);
  const move = legalMoves(position).find(
    (candidate) => candidate.from === from && candidate.to === to,
  );
  if (!move) throw new Error(`${from}${to} is not legal in ${fen}`);
  return move;
}

interface CaseOptions {
  fen?: string;
  from?: string;
  to?: string;
  before: EngineScore;
  after: EngineScore;
  bestMove?: string;
  secondBest?: EngineScore;
  previousMove?: Move | null;
  isBook?: boolean;
  /** The engine's best reply in the resulting position, used by the sacrifice test. */
  reply?: string;
}

function makeCase(options: CaseOptions): ClassifyInput {
  const fen = options.fen ?? STARTING_FEN;
  const move = moveIn(fen, options.from ?? 'e2', options.to ?? 'e4');
  const position = parseFen(fen);
  const nextPosition = applyMove(position, move);

  const before = evaluation(options.before, options.bestMove ?? moveKey(move), options.secondBest);
  const after = evaluation(options.after, options.reply ?? 'a7a6');

  return {
    before,
    after,
    move,
    position,
    nextPosition,
    previousMove: options.previousMove ?? null,
    ...(options.isBook === undefined ? {} : { isBook: options.isBook }),
  };
}

/** A move that is deliberately *not* the engine's choice, so bands are testable. */
function band(before: EngineScore, after: EngineScore): ClassifyInput {
  return makeCase({ before, after, bestMove: 'g1f3' });
}

describe('perspective', () => {
  it('reads win percentage from the mover, not from White', () => {
    expect(winPercentFor(cp(300), 'w')).toBeGreaterThan(50);
    expect(winPercentFor(cp(300), 'b')).toBeLessThan(50);
    expect(winPercentFor(cp(300), 'w') + winPercentFor(cp(300), 'b')).toBeCloseTo(100, 6);
  });

  it('never reports a negative loss', () => {
    // The engine can be pessimistic before a move and kinder after it.
    expect(winPercentLoss(band(cp(0), cp(200)))).toBe(0);
  });

  // The bug that would otherwise ship: an identical mistake by Black scoring
  // differently from the same mistake by White.
  it('labels the same swing identically for both colours', () => {
    const white = makeCase({ before: cp(0), after: cp(-300), bestMove: 'g1f3' });

    const blackFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    const black = makeCase({
      fen: blackFen,
      from: 'e7',
      to: 'e5',
      // Mirrored: the same swing against the mover, expressed White-relative.
      before: cp(0),
      after: cp(300),
      bestMove: 'g8f6',
    });

    expect(winPercentLoss(white)).toBeCloseTo(winPercentLoss(black), 6);
    expect(classify(white)).toBe(classify(black));
    expect(classify(black)).toBe('blunder');
  });
});

describe('threshold bands', () => {
  /** Win percentages either side of a boundary, expressed as evaluations. */
  const at = (lossPct: number): ClassifyInput => {
    const before = 50;
    const target = before - lossPct;
    // Invert the sigmoid so the fixture lands exactly on the requested loss.
    // Left unrounded: rounding to whole centipawns moves a 1.99 case over the
    // boundary and the test would be measuring the rounding, not the band.
    const centipawns = Math.log(target / (100 - target)) / 0.00368208;
    return band(cp(0), cp(centipawns));
  };

  it('labels a move matching the engine as best', () => {
    expect(classify(makeCase({ before: cp(20), after: cp(18) }))).toBe('best');
  });

  it('walks down the bands as the loss grows', () => {
    expect(classify(at(1))).toBe('excellent');
    expect(classify(at(3))).toBe('good');
    expect(classify(at(7))).toBe('inaccuracy');
    expect(classify(at(15))).toBe('mistake');
    expect(classify(at(30))).toBe('blunder');
  });

  it('puts the boundaries on the lower band', () => {
    expect(classify(at(1.99))).toBe('excellent');
    expect(classify(at(2.01))).toBe('good');
    expect(classify(at(4.99))).toBe('good');
    expect(classify(at(5.01))).toBe('inaccuracy');
    expect(classify(at(9.99))).toBe('inaccuracy');
    expect(classify(at(10.01))).toBe('mistake');
    expect(classify(at(19.99))).toBe('mistake');
    expect(classify(at(20.01))).toBe('blunder');
  });

  // The ticket asks for two things that meet here: "mate-to-losing classifies
  // as Blunder, not as a huge centipawn swing", and a Miss table entry for
  // throwing away an available mate. The table wins — Miss is tested before
  // Blunder — so this lands in the big-loss family as Miss, which is the more
  // useful of the two labels. What matters either way is that the mate is not
  // arithmetic'd into a mild centipawn change.
  it('treats losing a forced mate as a large loss, not a mild centipawn change', () => {
    const thrownAway = makeCase({ before: mate(3), after: cp(-50), bestMove: 'g1f3' });

    expect(winPercentLoss(thrownAway)).toBeGreaterThan(50);
    expect(classify(thrownAway)).toBe('miss');
  });

  it('is a blunder when the swing is just as large but nothing was won', () => {
    expect(classify(makeCase({ before: cp(30), after: cp(-700), bestMove: 'g1f3' }))).toBe(
      'blunder',
    );
  });
});

describe('book and forced', () => {
  it('labels a book move first, whatever the evaluation says', () => {
    expect(classify(makeCase({ before: cp(0), after: cp(-900), isBook: true }))).toBe('book');
  });

  it('labels the only legal move forced, whatever the evaluation says', () => {
    // Black is in check from the queen and may only take it.
    const fen = '4k3/8/8/8/8/8/4q3/4K3 w - - 0 1';
    const forced = makeCase({
      fen,
      from: 'e1',
      to: 'e2',
      before: cp(0),
      after: cp(-900),
      bestMove: 'g1f3',
    });

    expect(legalMoves(parseFen(fen))).toHaveLength(1);
    expect(classify(forced)).toBe('forced');
  });
});

describe('great', () => {
  const onlyMove = (gap: EngineScore) =>
    makeCase({ before: cp(50), after: cp(48), secondBest: gap });

  it('fires when the second-best line is materially worse', () => {
    expect(classify(onlyMove(cp(-400)))).toBe('great');
  });

  it('does not fire when several moves are about as good', () => {
    expect(classify(onlyMove(cp(40)))).toBe('best');
  });

  it('needs a second line at all', () => {
    expect(classify(makeCase({ before: cp(50), after: cp(48) }))).toBe('best');
  });
});

describe('brilliant', () => {
  // White plays Bxh7+, giving up a bishop; Black's best reply takes it.
  const SACRIFICE_FEN = 'rnbq1rk1/pppp1ppp/5n2/4p3/1b2P3/2N2N2/PPPPBPPP/R1BQK2R w KQ - 0 1';

  const sacrifice = (overrides: Partial<CaseOptions> = {}) =>
    makeCase({
      fen: SACRIFICE_FEN,
      from: 'c3',
      to: 'd5',
      before: cp(30),
      after: cp(35),
      reply: 'f6d5',
      ...overrides,
    });

  it('fires on a sound sacrifice from a balanced position', () => {
    expect(classify(sacrifice())).toBe('brilliant');
  });

  // The classic failure mode: without this the label fires constantly.
  it('does not fire when the mover is already winning comfortably', () => {
    expect(classify(sacrifice({ before: cp(1200), after: cp(1200) }))).not.toBe('brilliant');
  });

  it('does not fire when the sacrifice does not work', () => {
    expect(classify(sacrifice({ before: cp(-600), after: cp(-600) }))).not.toBe('brilliant');
  });

  it('does not fire on a recapture', () => {
    const previous: Move = {
      from: 'e6',
      to: 'd5',
      piece: 'p',
      captured: 'n',
      flags: ['capture'],
    };

    expect(classify(sacrifice({ previousMove: previous }))).not.toBe('brilliant');
  });

  it('does not fire when nothing is given up', () => {
    // The same position, but the engine's reply takes nothing.
    expect(classify(sacrifice({ reply: 'a7a6' }))).not.toBe('brilliant');
  });
});

describe('miss', () => {
  const winning = cp(800);

  it('fires when a won position is thrown away', () => {
    const missed = makeCase({ before: winning, after: cp(0), bestMove: 'g1f3' });

    expect(winPercentFor(winning, 'w')).toBeGreaterThan(WINNING_WIN_PCT);
    expect(classify(missed)).toBe('miss');
  });

  it('fires when a forced mate is available and not played', () => {
    expect(classify(makeCase({ before: mate(2), after: cp(50), bestMove: 'g1f3' }))).toBe('miss');
  });

  it('is a blunder, not a miss, when the position was never won', () => {
    expect(classify(makeCase({ before: cp(0), after: cp(-600), bestMove: 'g1f3' }))).toBe(
      'blunder',
    );
  });

  it('does not fire while the position stays won', () => {
    expect(classify(makeCase({ before: mate(2), after: cp(900), bestMove: 'g1f3' }))).not.toBe(
      'miss',
    );
  });
});

describe('accuracy', () => {
  it('scores a flawless move at 100', () => {
    // The `+ 1` in Lichess's formula is what makes this exactly 100.
    expect(moveAccuracy(0)).toBe(100);
  });

  it('falls away as the loss grows, and never below zero', () => {
    expect(moveAccuracy(5)).toBeLessThan(moveAccuracy(0));
    expect(moveAccuracy(20)).toBeLessThan(moveAccuracy(5));
    expect(moveAccuracy(100)).toBeGreaterThanOrEqual(0);
    expect(moveAccuracy(1000)).toBe(0);
  });

  it('ignores a negative loss', () => {
    expect(moveAccuracy(-10)).toBe(100);
  });

  it('matches the published curve at a known point', () => {
    // 103.1668100711649 * exp(-0.04354415386753951 * 10) - 3.166924740191411 + 1
    expect(moveAccuracy(10)).toBeCloseTo(64.58, 2);
  });
});
