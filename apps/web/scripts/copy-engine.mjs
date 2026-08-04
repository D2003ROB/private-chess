import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies the Stockfish WASM build into `public/engine/` at install time.
 *
 * The engine's `.js` loader resolves its `.wasm` sibling relative to itself,
 * so the pair has to be served from a real directory under their real names.
 * Importing them through the bundler gets them hashed and moved, and the
 * lookup breaks — copying sidesteps that argument entirely.
 *
 * The copies are gitignored: they are 7 MB of build output belonging to a
 * pinned dependency, not source.
 */

const FILES = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'public', 'engine');

const require = createRequire(import.meta.url);

function engineDirectory() {
  // The published package puts the builds in `bin/`; older ones used `src/`.
  const packageRoot = dirname(require.resolve('stockfish/package.json'));

  for (const candidate of ['bin', 'src']) {
    if (existsSync(join(packageRoot, candidate, FILES[0]))) return join(packageRoot, candidate);
  }

  throw new Error(
    `Could not find ${FILES[0]} under ${packageRoot}. The stockfish package layout has changed.`,
  );
}

const source = engineDirectory();
mkdirSync(target, { recursive: true });

for (const file of FILES) {
  copyFileSync(join(source, file), join(target, file));
}

console.log(`Copied ${FILES.length} engine files into ${target}`);
