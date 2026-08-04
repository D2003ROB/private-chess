import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { EnginePort } from '../src/engine/types';

/**
 * An `EnginePort` backed by the real engine running as a child process.
 *
 * The browser uses a Web Worker; this exists so the integration test can drive
 * the same `EngineClient` against the actual engine. That the seam is small
 * enough for both is most of the argument for having defined it.
 */
export function createProcessPort(): EnginePort {
  const runner = fileURLToPath(new URL('./engine-runner.cjs', import.meta.url));
  const child = spawn(process.execPath, [runner], { stdio: ['pipe', 'pipe', 'pipe'] });

  const messageHandlers: ((line: string) => void)[] = [];
  const errorHandlers: ((message: string) => void)[] = [];

  createInterface({ input: child.stdout }).on('line', (line) => {
    for (const handler of [...messageHandlers]) handler(line);
  });

  child.on('error', (cause: Error) => {
    for (const handler of [...errorHandlers]) handler(cause.message);
  });

  return {
    postMessage: (command) => {
      child.stdin.write(`${command}\n`);
    },
    terminate: () => {
      messageHandlers.length = 0;
      errorHandlers.length = 0;
      child.kill();
    },
    onMessage: (handler) => {
      messageHandlers.push(handler);
    },
    onError: (handler) => {
      errorHandlers.push(handler);
    },
  };
}
