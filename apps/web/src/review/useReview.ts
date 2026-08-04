import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayedGame } from '@chess/shared';
import type { EngineClient } from '../engine/EngineClient';
import {
  analyseGame,
  DEFAULT_REVIEW_DEPTH,
  evaluationCache,
  type ReviewDepth,
} from './analyseGame';
import { buildReview } from './buildReview';
import type { GameReview } from './types';

export type ReviewStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

export interface ReviewProgress {
  done: number;
  total: number;
  /** Seconds remaining, from the rate so far. `null` until there is a rate. */
  etaSeconds: number | null;
}

export interface UseReviewResult {
  status: ReviewStatus;
  progress: ReviewProgress;
  review: GameReview | null;
  error: string | null;
  start: () => void;
  cancel: () => void;
}

const IDLE_PROGRESS: ReviewProgress = { done: 0, total: 0, etaSeconds: null };

/**
 * Runs a whole-game analysis, with progress and a working cancel.
 *
 * A 40-move game is 81 evaluations and takes the better part of a minute, so
 * this reports progress rather than spinning, and cancelling has to leave the
 * app usable rather than merely stopping the updates.
 */
export function useReview(game: PlayedGame, depth: ReviewDepth = DEFAULT_REVIEW_DEPTH) {
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [progress, setProgress] = useState<ReviewProgress>(IDLE_PROGRESS);
  const [review, setReview] = useState<GameReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<EngineClient | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const teardown = useCallback(() => {
    clientRef.current?.dispose();
    clientRef.current = null;
    controllerRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    if (game.moves.length === 0) return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus('running');
    setError(null);
    setProgress({ done: 0, total: game.positions.length, etaSeconds: null });

    const run = async () => {
      const [{ EngineClient: Client }, { createWorkerPort }] = await Promise.all([
        import('../engine/EngineClient'),
        import('../engine/workerPort'),
      ]);
      if (runIdRef.current !== runId) return;

      const client = new Client({ createPort: () => createWorkerPort(), multiPv: 3 });
      clientRef.current = client;
      await client.init();
      if (runIdRef.current !== runId) return;

      const startedAt = Date.now();

      const evals = await analyseGame(game, {
        analyser: client,
        depth,
        signal: controller.signal,
        cache: evaluationCache,
        onProgress: (done, total) => {
          if (runIdRef.current !== runId) return;
          const elapsed = (Date.now() - startedAt) / 1000;
          setProgress({
            done,
            total,
            etaSeconds: done > 0 ? Math.round((elapsed / done) * (total - done)) : null,
          });
        },
      });

      if (runIdRef.current !== runId) return;

      setReview(buildReview(game, evals, depth));
      setStatus(controller.signal.aborted ? 'cancelled' : 'done');
      teardown();
    };

    run().catch((cause: unknown) => {
      if (runIdRef.current !== runId) return;
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'The review failed.');
      teardown();
    });
  }, [game, depth, teardown]);

  return { status, progress, review, error, start, cancel } satisfies UseReviewResult;
}
