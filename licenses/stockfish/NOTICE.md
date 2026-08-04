# Stockfish

This application ships the Stockfish chess engine, compiled to WebAssembly, to the browser.
That is **distribution**, and it carries the obligations of the GNU General Public License,
version 3 or later.

## What is distributed

|             |                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------- |
| Engine      | Stockfish 18 Lite (single-threaded), WebAssembly build                                      |
| Files       | `stockfish-18-lite-single.js`, `stockfish-18-lite-single.wasm`                              |
| Served from | `/engine/` — copied at install time from the pinned `stockfish` npm package, version 18.0.8 |
| Licence     | GPL-3.0-or-later — full text in [`COPYING.txt`](./COPYING.txt)                              |

The files are not committed to this repository. They are copied out of `node_modules` by
`apps/web/scripts/copy-engine.mjs` during `pnpm install`, and the package version is pinned
exactly so the binary cannot change under a minor bump.

## Attribution

- **Stockfish** — T. Romstad, M. Costalba, J. Kiiski, G. Linscott and contributors.
  <https://github.com/official-stockfish/Stockfish>
- **stockfish.js**, the WebAssembly port — Nathan Rugg, sponsored by Chess.com.
  <https://github.com/nmrugg/stockfish.js>
- **Neural network** — `nn-9067e33176e8.nnue` by Linmiao Xu (linrock), embedded in the build.

The engine is credited visibly in the UI, in the analysis panel beside the board, with a link
to its source.

## Corresponding source

The engine is used unmodified. Its complete corresponding source is the upstream repositories
linked above, at the tag matching `stockfish@18.0.8`.

## If this project ever goes closed-source

Shipping the engine to the browser is what creates the copyleft obligation — GPLv3 is not AGPL,
so running the engine on a server and serving only its _output_ over a network is not
distribution. If this application becomes commercial and closed-source, the engine should move
to an arms-length server-side process communicating over UCI, which is the usual arrangement.
That is an architectural change, not a licence header change. Take advice from someone qualified
before relying on this paragraph.
