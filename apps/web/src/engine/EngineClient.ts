import type {
  AnalyseOptions,
  EngineEvent,
  EngineEventMap,
  EngineLine,
  EnginePort,
  EngineState,
  Evaluation,
  PieceColor,
  Unsubscribe,
} from './types';
import { fenTurn, parseBestMove, parseInfo, toWhitePerspective } from './uci';

/**
 * The engine is a single stateful stream. Options may not be changed and a
 * second search may not be started while one is running — do either and it
 * hangs. So every command goes through here; nothing is fire-and-forget.
 *
 * Framework-free by design: it talks to an `EnginePort`, not to `Worker`.
 */

export interface EngineClientOptions {
  createPort: () => EnginePort;
  /** Transposition table size. 64 MB is comfortable in a browser tab. */
  hashMb?: number;
  multiPv?: number;
  depth?: number;
}

interface AnalyseRequest {
  fen: string;
  depth: number;
  multiPv: number;
}

interface Waiter {
  test: (line: string) => boolean;
  resolve: () => void;
  reject: (error: Error) => void;
}

const DEFAULT_DEPTH = 18;
const DEFAULT_MULTI_PV = 3;
const DEFAULT_HASH_MB = 64;

export class EngineClient {
  private readonly options: EngineClientOptions;
  private port: EnginePort | null = null;
  private state: EngineState = 'idle';

  /**
   * Bumped on every new position. A search carries the generation it was
   * started under, and anything stale is dropped — without this the tail of
   * the previous search paints over the new position's eval for a few hundred
   * milliseconds, which looks like a flicker and is actually a wrong number.
   */
  private generation = 0;
  private searchGeneration = -1;
  private searching = false;
  private searchFen = '';
  private searchTurn: PieceColor = 'w';

  /** The newest request, held until the engine can legally accept it. */
  private queued: AnalyseRequest | null = null;

  private lines = new Map<number, EngineLine>();
  private depth = 0;
  private seldepth: number | null = null;
  private nodes: number | null = null;
  private nps: number | null = null;

  private multiPv: number;
  /**
   * Handshake acknowledgements already seen. The engine may emit `uciok` and
   * `readyok` in the same tick, and the waiter for the second is only
   * registered after the first resolves — so remember them rather than racing.
   */
  private handshake = new Set<string>();
  private waiters: Waiter[] = [];
  private stopWaiters: (() => void)[] = [];
  private handlers = new Map<EngineEvent, Set<(payload: never) => void>>();

  constructor(options: EngineClientOptions) {
    this.options = options;
    this.multiPv = options.multiPv ?? DEFAULT_MULTI_PV;
  }

  getState(): EngineState {
    return this.state;
  }

  on<E extends EngineEvent>(event: E, handler: (payload: EngineEventMap[E]) => void): Unsubscribe {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as (payload: never) => void);
    this.handlers.set(event, set);

    return () => {
      set.delete(handler as (payload: never) => void);
    };
  }

  /**
   * Runs the handshake. Nothing but `uci`/`setoption`/`isready` may be sent
   * before `readyok` — anything else is silently dropped by the engine.
   */
  async init(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'error') return;

    this.setState('loading');
    this.handshake.clear();

    const port = this.options.createPort();
    this.port = port;
    port.onMessage((line) => {
      this.handleLine(line);
    });
    port.onError((message) => {
      this.fail(message);
    });

    this.send('uci');
    await this.expect('uciok');

    this.send(`setoption name MultiPV value ${this.multiPv}`);
    this.send(`setoption name Hash value ${this.options.hashMb ?? DEFAULT_HASH_MB}`);
    this.send('isready');
    await this.expect('readyok');

    this.setState('ready');
    this.drain();
  }

  /**
   * Analyses a position, superseding whatever was running.
   *
   * A search in flight is stopped and the new request held until its
   * `bestmove` arrives — sending `position` on top of a running search is what
   * hangs the engine.
   */
  analyse(fen: string, options: AnalyseOptions = {}): void {
    const request: AnalyseRequest = {
      fen,
      depth: options.depth ?? this.options.depth ?? DEFAULT_DEPTH,
      multiPv: options.multiPv ?? this.multiPv,
    };

    this.generation += 1;
    this.queued = request;

    if (this.state === 'ready') {
      this.drain();
      return;
    }

    if (this.searching) this.send('stop');
    // Otherwise it is still loading, and `init` drains the queue at `readyok`.
  }

  /** Stops the current search and resolves once the engine acknowledges it. */
  async stop(): Promise<void> {
    if (!this.searching) return;

    this.generation += 1;
    this.queued = null;
    this.send('stop');

    await new Promise<void>((resolve) => {
      this.stopWaiters.push(resolve);
    });
  }

  /**
   * Terminates the worker and drops every handler. Must be called — an
   * orphaned Stockfish worker will happily saturate a core forever.
   */
  dispose(): void {
    this.port?.terminate();
    this.port = null;
    this.searching = false;
    this.queued = null;
    this.handlers.clear();
    this.lines.clear();

    for (const waiter of this.waiters) waiter.reject(new Error('Engine disposed'));
    this.waiters = [];
    for (const resolve of this.stopWaiters) resolve();
    this.stopWaiters = [];

    this.state = 'idle';
  }

  private drain(): void {
    const request = this.queued;
    if (!request || this.searching || this.state !== 'ready') return;

    this.queued = null;
    this.searchGeneration = this.generation;
    this.searchFen = request.fen;
    this.searchTurn = fenTurn(request.fen);
    this.lines.clear();
    this.depth = 0;
    this.seldepth = null;
    this.nodes = null;
    this.nps = null;

    // Safe here and nowhere else: options may only change between searches.
    if (request.multiPv !== this.multiPv) {
      this.multiPv = request.multiPv;
      this.send(`setoption name MultiPV value ${this.multiPv}`);
    }

    this.searching = true;
    this.setState('searching');
    this.send(`position fen ${request.fen}`);
    this.send(`go depth ${request.depth}`);
  }

  private handleLine(raw: string): void {
    const line = raw.trim();
    if (line === 'uciok' || line === 'readyok') this.handshake.add(line);
    this.resolveWaiters(line);

    if (parseBestMove(line)) {
      this.onSearchEnded();
      return;
    }

    const info = parseInfo(line);
    if (!info) return;

    // Stale: this line belongs to a position the caller has moved on from.
    if (this.searchGeneration !== this.generation) return;

    this.lines.set(info.multipv, {
      multipv: info.multipv,
      score: toWhitePerspective(info.score, this.searchTurn),
      moves: info.moves,
    });

    if (info.depth !== null) this.depth = Math.max(this.depth, info.depth);
    if (info.seldepth !== null) this.seldepth = info.seldepth;
    if (info.nodes !== null) this.nodes = info.nodes;
    if (info.nps !== null) this.nps = info.nps;

    const lines = [...this.lines.values()].sort((a, b) => a.multipv - b.multipv);
    const best = lines[0];
    if (!best) return;

    this.emit('eval', {
      fen: this.searchFen,
      depth: this.depth,
      seldepth: this.seldepth,
      nodes: this.nodes,
      nps: this.nps,
      score: best.score,
      lines,
    } satisfies Evaluation);
  }

  private onSearchEnded(): void {
    this.searching = false;

    for (const resolve of this.stopWaiters) resolve();
    this.stopWaiters = [];

    if (this.state !== 'error') this.setState('ready');
    this.drain();
  }

  private send(command: string): void {
    this.port?.postMessage(command);
  }

  private expect(token: string): Promise<void> {
    if (this.handshake.has(token)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.waiters.push({ test: (line) => line === token, resolve, reject });
    });
  }

  private resolveWaiters(line: string): void {
    const remaining: Waiter[] = [];

    for (const waiter of this.waiters) {
      if (waiter.test(line)) waiter.resolve();
      else remaining.push(waiter);
    }

    this.waiters = remaining;
  }

  private fail(message: string): void {
    this.setState('error');
    this.emit('error', message);

    for (const waiter of this.waiters) waiter.reject(new Error(message));
    this.waiters = [];
  }

  private setState(state: EngineState): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('state', state);
  }

  private emit<E extends EngineEvent>(event: E, payload: EngineEventMap[E]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of [...handlers]) (handler as (value: EngineEventMap[E]) => void)(payload);
  }
}
