import type { EnginePort } from './types';

/**
 * The real transport: a classic Web Worker running the Stockfish WASM build.
 *
 * The URL is a plain public path, deliberately. The engine's `.js` loader
 * resolves its `.wasm` sibling relative to itself, so the two must sit
 * together in a real directory with their real names — bundling or hashing
 * them breaks that lookup, and fighting the bundler over it is the single
 * biggest time sink in this integration.
 */
export const ENGINE_WORKER_URL = `${import.meta.env.BASE_URL}engine/stockfish-18-lite-single.js`;

export function createWorkerPort(url: string = ENGINE_WORKER_URL): EnginePort {
  const worker = new Worker(url);

  return {
    postMessage: (command) => {
      worker.postMessage(command);
    },
    terminate: () => {
      worker.terminate();
    },
    onMessage: (handler) => {
      worker.addEventListener('message', (event: MessageEvent<unknown>) => {
        handler(typeof event.data === 'string' ? event.data : String(event.data));
      });
    },
    onError: (handler) => {
      worker.addEventListener('error', (event: ErrorEvent) => {
        handler(event.message || 'The engine worker failed to load.');
      });
    },
  };
}
