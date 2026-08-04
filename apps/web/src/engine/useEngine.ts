import { useCallback, useEffect, useRef, useState } from 'react';
import type { Position } from '@chess/shared';
import { toFen } from '@chess/rules';
import type { EngineClient } from './EngineClient';
import type { EngineState, Evaluation } from './types';

/** Long enough that clicking through moves does not queue twenty searches. */
const DEBOUNCE_MS = 150;

export interface UseEngineOptions {
  /**
   * Off by default at the call site: enabling downloads ~7 MB. The toggle is
   * persisted by the page that owns `chess:board-prefs`, so there is one
   * writer for that key rather than two.
   */
  enabled: boolean;
  depth: number;
  multiPv?: number;
}

export interface UseEngineResult {
  state: EngineState;
  evaluation: Evaluation | null;
  error: string | null;
  retry: () => void;
}

/**
 * Keeps an `EngineClient` alive for as long as analysis is switched on, and
 * feeds it the current position.
 *
 * The engine module is imported dynamically on first enable, so a user who
 * never turns it on never pays for it — neither the code nor the WASM.
 */
export function useEngine(position: Position, options: UseEngineOptions): UseEngineResult {
  const { enabled, depth, multiPv = 3 } = options;

  const [state, setState] = useState<EngineState>('idle');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const clientRef = useRef<EngineClient | null>(null);
  const fen = toFen(position);
  // Read by the loader once the engine is ready, which may be several moves
  // after it was switched on. Kept current in an effect rather than during
  // render, which React reserves for pure work.
  const requestRef = useRef({ fen, depth });

  useEffect(() => {
    requestRef.current = { fen, depth };
  }, [fen, depth]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let frame = 0;
    let latest: Evaluation | null = null;
    let client: EngineClient | null = null;

    const load = async () => {
      const [{ EngineClient: Client }, { createWorkerPort }] = await Promise.all([
        import('./EngineClient'),
        import('./workerPort'),
      ]);
      if (disposed) return;

      client = new Client({ createPort: () => createWorkerPort(), multiPv });
      clientRef.current = client;

      client.on('state', setState);
      client.on('error', (message) => {
        setError(message);
      });
      client.on('eval', (next) => {
        // `info` lines arrive dozens of times a second. Buffer the newest and
        // paint once per frame — depth should tick upward, not re-render React
        // sixty times a second.
        latest = next;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (latest) setEvaluation(latest);
        });
      });

      // Queued inside the client until `readyok`; nothing reaches the engine early.
      client.analyse(requestRef.current.fen, { depth: requestRef.current.depth });
      await client.init();
    };

    load().catch((cause: unknown) => {
      if (disposed) return;
      setState('error');
      setError(cause instanceof Error ? cause.message : 'The engine failed to start.');
    });

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      client?.dispose();
      clientRef.current = null;
      setState('idle');
      setEvaluation(null);
      setError(null);
    };
  }, [enabled, multiPv, attempt]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      clientRef.current?.analyse(fen, { depth });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, fen, depth]);

  // The evaluation on screen belongs to the position on screen, or to nothing.
  // Switched off, there is nothing to report whatever the last search left behind.
  const current = enabled && evaluation?.fen === fen ? evaluation : null;

  const retry = useCallback(() => {
    setError(null);
    setEvaluation(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    state: enabled ? state : 'idle',
    evaluation: current,
    error: enabled ? error : null,
    retry,
  };
}
