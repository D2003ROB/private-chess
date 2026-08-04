import { describe, expect, it, vi } from 'vitest';
import { EngineClient } from './EngineClient';
import type { EnginePort, Evaluation } from './types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Let `init`'s continuation run: it resumes on a microtask after each ack. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const BLACK_TO_MOVE = '6k1/8/8/8/8/7q/6p1/6K1 b - - 0 1';

/** A scripted engine: records what it is sent, emits what the test decides. */
function fakePort() {
  const sent: string[] = [];
  let onMessage: (line: string) => void = () => {};
  let onError: (message: string) => void = () => {};
  const terminate = vi.fn();

  const port: EnginePort = {
    postMessage: (command) => {
      sent.push(command);
    },
    terminate,
    onMessage: (handler) => {
      onMessage = handler;
    },
    onError: (handler) => {
      onError = handler;
    },
  };

  return {
    port,
    sent,
    terminate,
    emit: (line: string) => {
      onMessage(line);
    },
    fail: (message: string) => {
      onError(message);
    },
  };
}

async function readyClient(multiPv = 3) {
  const engine = fakePort();
  const client = new EngineClient({ createPort: () => engine.port, multiPv });
  const evaluations: Evaluation[] = [];
  client.on('eval', (evaluation) => evaluations.push(evaluation));

  const init = client.init();
  engine.emit('uciok');
  engine.emit('readyok');
  await init;

  return { client, engine, evaluations };
}

describe('handshake', () => {
  it('sends nothing but the handshake before readyok', async () => {
    const engine = fakePort();
    const client = new EngineClient({ createPort: () => engine.port });

    const init = client.init();
    client.analyse(START);

    expect(engine.sent).toEqual(['uci']);

    engine.emit('uciok');
    await flush();
    expect(engine.sent.some((command) => command.startsWith('position'))).toBe(false);
    expect(engine.sent).toContain('setoption name MultiPV value 3');

    engine.emit('readyok');
    await init;

    // Only now does the held request go out.
    expect(engine.sent).toContain(`position fen ${START}`);
    expect(engine.sent.at(-1)).toBe('go depth 18');
    client.dispose();
  });

  it('runs only the newest request queued while loading', async () => {
    const engine = fakePort();
    const client = new EngineClient({ createPort: () => engine.port });

    const init = client.init();
    client.analyse(START);
    client.analyse(BLACK_TO_MOVE);
    engine.emit('uciok');
    engine.emit('readyok');
    await init;

    const positions = engine.sent.filter((command) => command.startsWith('position'));
    expect(positions).toEqual([`position fen ${BLACK_TO_MOVE}`]);
    client.dispose();
  });
});

describe('search lifecycle', () => {
  it('stops the running search and waits for bestmove before the next position', async () => {
    const { client, engine } = await readyClient();

    client.analyse(START);
    expect(engine.sent.at(-1)).toBe('go depth 18');

    client.analyse(BLACK_TO_MOVE);
    // Stopped, but the new position is not sent on top of a running search.
    expect(engine.sent.at(-1)).toBe('stop');
    expect(engine.sent).not.toContain(`position fen ${BLACK_TO_MOVE}`);

    engine.emit('bestmove e2e4 ponder e7e5');
    expect(engine.sent).toContain(`position fen ${BLACK_TO_MOVE}`);
    expect(engine.sent.at(-1)).toBe('go depth 18');
    client.dispose();
  });

  it('leaves exactly one search running after rapid position changes', async () => {
    const { client, engine } = await readyClient();

    client.analyse(START);
    for (let move = 0; move < 5; move += 1) client.analyse(`${BLACK_TO_MOVE} ${move}`);

    engine.emit('bestmove e2e4');

    const gos = engine.sent.filter((command) => command.startsWith('go '));
    const positions = engine.sent.filter((command) => command.startsWith('position'));
    expect(gos).toHaveLength(2);
    expect(positions.at(-1)).toBe(`position fen ${BLACK_TO_MOVE} 4`);
    client.dispose();
  });

  it('reports the state machine transitions', async () => {
    const engine = fakePort();
    const client = new EngineClient({ createPort: () => engine.port });
    const states: string[] = [];
    client.on('state', (state) => states.push(state));

    const init = client.init();
    engine.emit('uciok');
    engine.emit('readyok');
    await init;

    client.analyse(START);
    engine.emit('bestmove e2e4');

    expect(states).toEqual(['loading', 'ready', 'searching', 'ready']);
    client.dispose();
  });
});

describe('evaluations', () => {
  it('emits White-relative scores for a Black-to-move position', async () => {
    const { client, engine, evaluations } = await readyClient();

    client.analyse(BLACK_TO_MOVE);
    engine.emit('info depth 10 multipv 1 score cp 250 nodes 900 pv h3g4');

    expect(evaluations.at(-1)?.score).toEqual({ kind: 'cp', value: -250 });
    client.dispose();
  });

  it('collects the MultiPV lines in order', async () => {
    const { client, engine, evaluations } = await readyClient();

    client.analyse(START);
    engine.emit('info depth 8 multipv 2 score cp 21 pv d2d4 d7d5');
    engine.emit('info depth 8 multipv 1 score cp 34 pv e2e4 e7e5');
    engine.emit('info depth 8 multipv 3 score cp 12 pv g1f3');

    const latest = evaluations.at(-1);
    expect(latest?.lines.map((line) => line.multipv)).toEqual([1, 2, 3]);
    expect(latest?.score).toEqual({ kind: 'cp', value: 34 });
    expect(latest?.depth).toBe(8);
    expect(latest?.fen).toBe(START);
    client.dispose();
  });

  it('drops info lines belonging to a superseded search', async () => {
    const { client, engine, evaluations } = await readyClient();

    client.analyse(START);
    engine.emit('info depth 6 multipv 1 score cp 30 pv e2e4');
    expect(evaluations).toHaveLength(1);

    // The user has moved on; the old search is still winding down.
    client.analyse(BLACK_TO_MOVE);
    engine.emit('info depth 20 multipv 1 score cp 900 pv e2e4');
    engine.emit('info depth 21 multipv 1 score cp 950 pv e2e4');

    expect(evaluations).toHaveLength(1);
    expect(evaluations.at(-1)?.fen).toBe(START);

    // Only once the new search actually starts do evaluations resume.
    engine.emit('bestmove e2e4');
    engine.emit('info depth 4 multipv 1 score cp 10 pv h3g4');

    expect(evaluations).toHaveLength(2);
    expect(evaluations.at(-1)?.fen).toBe(BLACK_TO_MOVE);
    client.dispose();
  });
});

describe('failure and teardown', () => {
  it('reports a worker failure as a retryable error state', async () => {
    const engine = fakePort();
    const client = new EngineClient({ createPort: () => engine.port });
    const errors: string[] = [];
    client.on('error', (message) => errors.push(message));

    const init = client.init().catch(() => undefined);
    engine.fail('WASM out of memory');
    await init;

    expect(errors).toEqual(['WASM out of memory']);
    expect(client.getState()).toBe('error');
    client.dispose();
  });

  it('terminates the worker and unsubscribes every handler', async () => {
    const { client, engine, evaluations } = await readyClient();

    client.analyse(START);
    client.dispose();

    expect(engine.terminate).toHaveBeenCalledOnce();

    engine.emit('info depth 9 multipv 1 score cp 55 pv e2e4');
    expect(evaluations).toHaveLength(0);
  });

  it('stops unsubscribing one handler from silencing the others', async () => {
    const { client, engine } = await readyClient();
    const seen: string[] = [];
    const off = client.on('eval', () => seen.push('first'));
    client.on('eval', () => seen.push('second'));

    off();
    client.analyse(START);
    engine.emit('info depth 3 multipv 1 score cp 8 pv e2e4');

    expect(seen).toEqual(['second']);
    client.dispose();
  });
});
