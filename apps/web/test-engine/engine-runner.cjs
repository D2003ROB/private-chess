/**
 * Speaks UCI over stdin/stdout, backed by the Stockfish WASM build.
 *
 * Plain CommonJS and run as its own process on purpose: loading the engine
 * inside the test runner puts it through Vitest's module transform, which
 * loses the `locateFile` override and leaves it hunting for the wrong `.wasm`.
 * A child process is also simply what a UCI engine normally is.
 */
const path = require('path');
const readline = require('readline');

const packageRoot = path.dirname(require.resolve('stockfish/package.json'));
const enginePath = path.join(packageRoot, 'bin', 'stockfish-18-lite-single.js');
const wasmPath = path.join(packageRoot, 'bin', 'stockfish-18-lite-single.wasm');

const init = require(enginePath);
const engine = {
  locateFile: (file) => (file.endsWith('.wasm') ? wasmPath : enginePath),
};

init()(engine).then(() => {
  const send = (command) =>
    engine.ccall('command', null, ['string'], [command], { async: /^go\b/.test(command) });

  readline.createInterface({ input: process.stdin }).on('line', (line) => {
    if (line.trim()) send(line.trim());
  });
});
