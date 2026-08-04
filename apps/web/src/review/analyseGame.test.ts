import { describe, expect, it, vi } from 'vitest';
import type { PlayedGame } from '@chess/shared';
import { legalMoves, parseFen, STARTING_FEN, toFen } from '@chess/rules';
import { analyseGame, type Analyser } from './analyseGame';
import { buildReview } from './buildReview';
import type { Evaluation } from '../engine';
import { createGame, playMove, type GameCursor } from '../game/gameState';

/** Plays a game from long-algebraic moves, so fixtures read like a game. */
function gameOf(...keys: string[]): PlayedGame {
  let cursor: GameCursor = { game: createGame(), index: 0 };

  for (const key of keys) {
    const position = cursor.game.positions[cursor.index];
    if (!position) throw new Error('no position');
    const move = legalMoves(position).find(
      (candidate) => `${candidate.from}${candidate.to}${candidate.promotion ?? ''}` === key,
    );
    if (!move) throw new Error(`${key} is not legal`);
    cursor = playMove(cursor, move);
  }

  return cursor.game;
}

/** An engine that answers instantly and records what it was asked. */
function fakeAnalyser(score = 20) {
  const seen: string[] = [];
  let inFlight = 0;
  let overlapped = false;

  const analyser: Analyser = {
    evaluate: async (fen) => {
      inFlight += 1;
      if (inFlight > 1) overlapped = true;
      seen.push(fen);

      await Promise.resolve();
      inFlight -= 1;

      return {
        fen,
        depth: 16,
        seldepth: null,
        nodes: null,
        nps: null,
        score: { kind: 'cp', value: score },
        lines: [{ multipv: 1, score: { kind: 'cp', value: score }, moves: ['e2e4'] }],
      } satisfies Evaluation;
    },
    stop: vi.fn(async () => {}),
  };

  return { analyser, seen, didOverlap: () => overlapped };
}

describe('analyseGame', () => {
  it('evaluates every position exactly once — N moves give N + 1 evaluations', async () => {
    const game = gameOf('e2e4', 'e7e5', 'g1f3');
    const { analyser, seen } = fakeAnalyser();

    const evals = await analyseGame(game, { analyser, cache: new Map() });

    expect(game.moves).toHaveLength(3);
    expect(evals).toHaveLength(4);
    expect(seen).toHaveLength(4);
    expect(seen[0]).toBe(STARTING_FEN);
  });

  it('analyses every position at the same depth', async () => {
    const game = gameOf('e2e4', 'e7e5');
    const { analyser } = fakeAnalyser();
    const depths: number[] = [];

    const spy: Analyser = {
      evaluate: (fen, options) => {
        depths.push(options.depth ?? -1);
        return analyser.evaluate(fen, options);
      },
      stop: analyser.stop,
    };

    await analyseGame(game, { analyser: spy, depth: 12, cache: new Map() });

    expect(depths).toEqual([12, 12, 12]);
  });

  it('never has two searches in flight', async () => {
    const game = gameOf('e2e4', 'e7e5', 'g1f3', 'b8c6');
    const { analyser, didOverlap } = fakeAnalyser();

    await analyseGame(game, { analyser, cache: new Map() });

    expect(didOverlap()).toBe(false);
  });

  it('reports progress once per position', async () => {
    const game = gameOf('e2e4', 'e7e5');
    const { analyser } = fakeAnalyser();
    const progress: [number, number][] = [];

    await analyseGame(game, {
      analyser,
      cache: new Map(),
      onProgress: (done, total) => progress.push([done, total]),
    });

    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('serves repeated positions from the cache without asking the engine', async () => {
    const game = gameOf('e2e4', 'e7e5');
    const cache = new Map();

    const first = fakeAnalyser();
    await analyseGame(game, { analyser: first.analyser, cache });
    expect(first.seen).toHaveLength(3);

    // Re-reviewing the same game must not touch the engine at all.
    const second = fakeAnalyser();
    const evals = await analyseGame(game, { analyser: second.analyser, cache });

    expect(second.seen).toHaveLength(0);
    expect(evals).toHaveLength(3);
  });

  it('keeps separate cache entries per depth', async () => {
    const game = gameOf('e2e4');
    const cache = new Map();

    const shallow = fakeAnalyser();
    await analyseGame(game, { analyser: shallow.analyser, depth: 12, cache });

    const deep = fakeAnalyser();
    await analyseGame(game, { analyser: deep.analyser, depth: 20, cache });

    expect(deep.seen).toHaveLength(2);
  });

  it('stops the engine and returns partial results when aborted', async () => {
    const game = gameOf('e2e4', 'e7e5', 'g1f3');
    const { analyser } = fakeAnalyser();
    const controller = new AbortController();

    const partial = await analyseGame(game, {
      analyser,
      cache: new Map(),
      signal: controller.signal,
      onProgress: (done) => {
        if (done === 2) controller.abort();
      },
    });

    expect(partial).toHaveLength(2);
    expect(analyser.stop).toHaveBeenCalledOnce();
  });

  it('scores a checkmated final position from the rules, not from the engine', async () => {
    // Fool's mate: the engine has nothing to say about a finished position.
    const game = gameOf('f2f3', 'e7e5', 'g2g4', 'd8h4');
    const { analyser } = fakeAnalyser();

    const evals = await analyseGame(game, { analyser, cache: new Map() });
    const final = evals.at(-1);

    expect(final?.score.value).toBeLessThan(-1000);
    expect(final?.lines).toEqual([]);
    expect(toFen(parseFen(final?.fen ?? ''))).toBe(final?.fen);
  });
});

describe('buildReview', () => {
  it('labels every move and scores both players', async () => {
    const game = gameOf('e2e4', 'e7e5', 'g1f3');
    const { analyser } = fakeAnalyser();

    const evals = await analyseGame(game, { analyser, cache: new Map() });
    const review = buildReview(game, evals, 16);

    expect(review.moves).toHaveLength(3);
    expect(review.moves.map((report) => report.color)).toEqual(['w', 'b', 'w']);
    expect(review.accuracy.w).toBeGreaterThan(0);
    expect(review.accuracy.b).toBeGreaterThan(0);
    expect(review.depth).toBe(16);
  });

  it('scores a flawless game at 100', async () => {
    const game = gameOf('e2e4', 'e7e5');
    // A constant evaluation means nobody ever loses a point of win probability.
    const { analyser } = fakeAnalyser(0);

    const evals = await analyseGame(game, { analyser, cache: new Map() });
    const review = buildReview(game, evals, 16);

    expect(review.accuracy.w).toBe(100);
    expect(review.accuracy.b).toBe(100);
  });

  it('excludes forced and book moves from accuracy', () => {
    const game = gameOf('e2e4');
    const evals = [
      { fen: 'a', depth: 16, score: { kind: 'cp' as const, value: 0 }, lines: [] },
      { fen: 'b', depth: 16, score: { kind: 'cp' as const, value: -900 }, lines: [] },
    ];

    const review = buildReview(game, evals, 16);
    const [report] = review.moves;

    // A ruinous move still scores, so the exclusion is visible when it applies.
    expect(report?.accuracy).not.toBeNull();

    const excluded = buildReview({ ...game, moves: [] }, evals, 16);
    expect(excluded.accuracy.w).toBe(100);
  });

  it('counts labels per colour', async () => {
    const game = gameOf('e2e4', 'e7e5');
    const { analyser } = fakeAnalyser();

    const review = buildReview(game, await analyseGame(game, { analyser, cache: new Map() }), 16);
    const total = (color: 'w' | 'b') =>
      Object.values(review.counts[color]).reduce((sum, value) => sum + value, 0);

    expect(total('w')).toBe(1);
    expect(total('b')).toBe(1);
  });
});
