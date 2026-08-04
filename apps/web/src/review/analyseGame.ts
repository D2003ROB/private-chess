import type { PlayedGame, Position } from '@chess/shared';
import { gameStatus, toFen } from '@chess/rules';
import type { AnalyseOptions, Evaluation, Score } from '../engine';
import type { PositionEval } from './types';

/**
 * Batch analysis of a whole game.
 *
 * **One pass, not two.** The naive approach evaluates each move twice — once
 * to find the best move, once to score what was played. Evaluating every
 * position exactly once gives both: the eval before move `i` is `evals[i]`,
 * the eval after it is `evals[i + 1]`, and the engine's preference at `i` is
 * `evals[i].lines[0].moves[0]`. That halves the wait, and the wait is the
 * entire UX problem with this feature.
 */

/** The slice of `EngineClient` this needs, so tests can hand it a stub. */
export interface Analyser {
  evaluate(fen: string, options: AnalyseOptions): Promise<Evaluation>;
  stop(): Promise<void>;
}

export interface AnalyseGameOptions {
  analyser: Analyser;
  /**
   * Fixed for every position. Varying it makes classifications incomparable
   * and invents blunders in endgames, where the same depth searches further.
   */
  depth?: number;
  multiPv?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  /** Keyed by depth and FEN, so transpositions and re-reviews come back free. */
  cache?: Map<string, PositionEval>;
}

export const DEFAULT_REVIEW_DEPTH = 16;
export const REVIEW_DEPTHS = [12, 16, 20] as const;
export type ReviewDepth = (typeof REVIEW_DEPTHS)[number];

/** A shared cache: re-reviewing a game the user has already seen is instant. */
export const evaluationCache = new Map<string, PositionEval>();

function cacheKey(fen: string, depth: number): string {
  return `${depth}|${fen}`;
}

/**
 * A finished position has no move to search, and the engine says so with
 * `bestmove (none)` and no score.
 *
 * Recorded as a large centipawn value rather than `mate 0`, because zero is
 * unsigned and could not say who delivered it. The win-percentage clamp turns
 * this into 100% or 0% either way.
 */
function terminalScore(position: Position): Score | null {
  const status = gameStatus(position);

  if (status.state === 'checkmate') {
    return { kind: 'cp', value: status.winner === 'w' ? 10_000 : -10_000 };
  }
  if (status.state === 'stalemate' || status.state === 'draw') {
    return { kind: 'cp', value: 0 };
  }

  return null;
}

function toPositionEval(fen: string, position: Position, evaluation: Evaluation): PositionEval {
  const terminal = terminalScore(position);

  return {
    fen,
    depth: evaluation.depth,
    score: terminal ?? evaluation.score,
    lines: terminal ? [] : evaluation.lines,
  };
}

/**
 * Evaluates every position in the game, strictly one at a time.
 *
 * Sequential on purpose: parallel workers exhaust memory on mobile and gain
 * nothing on a single-threaded build. Aborting stops the engine and resolves
 * with whatever was finished.
 */
export async function analyseGame(
  game: PlayedGame,
  options: AnalyseGameOptions,
): Promise<PositionEval[]> {
  const { analyser, signal, onProgress, cache = evaluationCache } = options;
  const depth = options.depth ?? DEFAULT_REVIEW_DEPTH;
  const multiPv = options.multiPv ?? 3;

  const total = game.positions.length;
  const evals: PositionEval[] = [];

  for (const [index, position] of game.positions.entries()) {
    if (signal?.aborted) {
      await analyser.stop();
      return evals;
    }

    const fen = toFen(position);
    const key = cacheKey(fen, depth);
    const cached = cache.get(key);

    if (cached) {
      evals.push(cached);
    } else {
      const evaluation = await analyser.evaluate(fen, { depth, multiPv });
      const result = toPositionEval(fen, position, evaluation);
      cache.set(key, result);
      evals.push(result);
    }

    onProgress?.(index + 1, total);
  }

  return evals;
}
