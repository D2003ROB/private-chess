import type { PieceColor } from '@chess/shared';

/**
 * `idle → loading → ready → searching → ready`, with `error` reachable from
 * anywhere. The UI reads this directly, so the names are the vocabulary.
 */
export type EngineState = 'idle' | 'loading' | 'ready' | 'searching' | 'error';

/**
 * An evaluation, **always from White's point of view**.
 *
 * UCI reports scores from the side to move's perspective; that is normalised
 * once, at the parser boundary, and never again. See `toWhitePerspective`.
 */
export interface Score {
  kind: 'cp' | 'mate';
  /** Centipawns, or moves-to-mate (not plies). Signed either way. */
  value: number;
}

/** One candidate line from MultiPV. */
export interface EngineLine {
  multipv: number;
  score: Score;
  /** Long algebraic (`e2e4`). SAN belongs to the notation ticket. */
  moves: string[];
}

export interface Evaluation {
  fen: string;
  depth: number;
  seldepth: number | null;
  nodes: number | null;
  nps: number | null;
  /** The best line's score, i.e. `lines[0].score`. */
  score: Score;
  lines: EngineLine[];
}

/**
 * The engine seen as a line-based transport. `EngineClient` talks to this and
 * never to `Worker`, which is what makes it testable without a browser and
 * without spawning 7 MB of WebAssembly.
 */
export interface EnginePort {
  postMessage(command: string): void;
  terminate(): void;
  onMessage(handler: (line: string) => void): void;
  onError(handler: (message: string) => void): void;
}

export interface AnalyseOptions {
  depth?: number;
  multiPv?: number;
}

export type EngineEventMap = {
  eval: Evaluation;
  state: EngineState;
  error: string;
};

export type EngineEvent = keyof EngineEventMap;

export type Unsubscribe = () => void;

export type { PieceColor };
