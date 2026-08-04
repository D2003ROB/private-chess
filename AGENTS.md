# AGENTS.md

Orientation for AI agents (and humans) working in this repository. Read this before touching code.
If you change something this file describes, **update this file in the same commit** — see
[Keeping this file honest](#keeping-this-file-honest).

Last verified against commit: the CHESS-7 game review.

---

## 1. What this repository is right now

A full-stack skeleton for a chess application: React UI → Fastify API → Postgres.

**It knows the rules of chess, who is winning, and how well each side played.** No notation, no
clocks, no computer opponent, no authentication, no websockets, and nothing persisted. What
exists is:

- a thin vertical slice — create and list game records — proving every layer is wired together
  (CHESS-1);
- a presentational chessboard at `/board`: squares, coordinates and 10 themes, holding no game
  state (CHESS-2);
- the Meridian piece set — twelve vector pieces drawn from scratch — rendered on the board from a
  static `STARTING_LAYOUT` map (CHESS-3);
- `@chess/rules`: movement geometry (CHESS-4), then a complete rules engine — captures, check,
  pins, castling, en passant, promotion, checkmate, stalemate and the draw conditions (CHESS-5),
  verified against the five standard perft positions;
- a hot-seat board at `/board`: click a piece for its legal moves, click a destination to play it;
- live evaluation from Stockfish 18 Lite running in a Web Worker — eval bar, score, depth and
  three candidate lines, off by default (CHESS-6). It analyses; it never plays and never
  validates;
- post-game review at `/review`: every move labelled, an accuracy score per side, a summary table
  and an eval graph (CHESS-7).

Treat that as deliberate. If a task asks for a computer opponent, notation, clocks, or anything
persisted, it is new work under a new ticket, not a gap to quietly fill.

## 2. Stack (locked)

These were chosen by ticket and must not be substituted without an explicit decision:

| Layer            | Choice                               |
| ---------------- | ------------------------------------ |
| Language         | TypeScript 5.9, strict, everywhere   |
| Package manager  | pnpm workspaces (pnpm 10)            |
| Runtime          | Node.js ≥ 20 LTS (developed on 22.x) |
| API framework    | Fastify 5                            |
| Web framework    | React 19 + Vite 7                    |
| Data fetching    | TanStack Query v5                    |
| Routing          | react-router-dom 7                   |
| Database         | PostgreSQL 16, via Docker Compose    |
| ORM / migrations | Prisma 6                             |
| Validation       | Zod 4, shared between API and web    |
| Testing          | Vitest 3                             |
| Lint / format    | ESLint 9 (flat config) + Prettier 3  |
| Chess engine     | `stockfish` 18.0.8, WASM, pinned     |

Vite 7 and Zod 4 are newer majors than the original ticket implied; they were adopted as the
current stable releases, not downgraded to match the text.

Do **not** add a component library, a CSS framework, a state-management library, or an HTTP client
library. The styling is intentionally plain CSS in one stylesheet.

## 3. Where everything is

```
.
├── apps/
│   ├── api/                      # Fastify + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Game model, GameStatus enum
│   │   │   └── migrations/       # committed SQL migrations
│   │   ├── src/
│   │   │   ├── app.ts            # buildApp() — wires routes, never listens
│   │   │   ├── server.ts         # entrypoint — loads .env, builds, listens
│   │   │   ├── env.ts            # Zod-validated process.env
│   │   │   ├── db.ts             # Database interface + Prisma implementation
│   │   │   └── routes/
│   │   │       ├── health.ts     # GET /health
│   │   │       └── games.ts      # /api/games routes + toGameDto()
│   │   └── test/
│   │       ├── app.test.ts       # inject() integration tests
│   │       └── fake-db.ts        # in-memory Database for tests
│   └── web/                      # React + Vite
│       ├── vite.config.ts        # dev server :5173, /api + /health proxy, vitest config
│       ├── scripts/copy-engine.mjs  # postinstall: engine assets into public/engine/
│       ├── test-engine/          # real-engine integration run (`pnpm test:engine`)
│       ├── public/engine/        # the WASM build — gitignored, copied at install
│       └── src/
│           ├── main.tsx          # mounts <App/>
│           ├── App.tsx           # QueryClientProvider + router + nav
│           ├── api/client.ts     # typed fetch wrapper + ApiError
│           ├── components/board/ # the chessboard (see §4a)
│           │   ├── Chessboard.tsx
│           │   ├── Chessboard.css
│           │   ├── themes.ts     # the 10-theme registry
│           │   ├── types.ts      # BoardTheme and component props
│           │   └── index.ts      # public exports
│           ├── components/analysis/ # eval bar, readout, candidate lines (see §4d)
│           ├── components/review/ # badges, summary, move list, eval graph (see §4e)
│           ├── components/game/  # the hot-seat board (see §4c)
│           │   ├── GameBoard.tsx # markers, promotion chooser, move navigation
│           │   ├── cells.ts      # square -> grid cell, the inverse of the board's map
│           │   └── GameBoard.css
│           ├── components/pieces/ # the piece set (see §4b)
│           │   ├── sets/meridian/ # 12 components + manifest + README
│           │   ├── Piece.tsx     # dispatcher — never draws
│           │   ├── pieceSets.ts  # registry, mirrors themes.ts
│           │   ├── types.ts      # artwork-side types only
│           │   └── index.ts
│           ├── engine/          # Stockfish plumbing (see §4d)
│           │   ├── uci.ts        # pure line parsers — no worker, no React
│           │   ├── EngineClient.ts # worker lifecycle, command queue, state machine
│           │   ├── useEngine.ts  # React hook wrapping EngineClient
│           │   ├── evalDisplay.ts # cp -> win%, formatting
│           │   ├── workerPort.ts # the real Worker transport
│           │   └── types.ts
│           ├── game/            # the played game, above the routes (see §4e)
│           │   ├── gameState.ts  # createGame / playMove — pure
│           │   └── GameContext.tsx # provider read by /board and /review
│           ├── review/           # classification and batch analysis (see §4e)
│           │   ├── thresholds.ts # every tunable number, in one object
│           │   ├── classify.ts   # the labels, in win probability
│           │   ├── accuracy.ts   # Lichess's formula
│           │   ├── analyseGame.ts # one pass over the game, cached
│           │   ├── labels.ts     # badge glyphs and colours
│           │   └── useReview.ts  # progress, cancel, result
│           ├── pages/GamesPage.tsx         # route /
│           ├── pages/BoardPage.tsx         # route /board — hot-seat board, picker
│           ├── pages/ReviewPage.tsx        # route /review — post-game review
│           ├── test/setup.ts     # jest-dom + cleanup
│           └── styles.css        # global styles + site nav
├── packages/
│   ├── shared/src/
│   │   ├── chess.ts              # Square, Piece, Board, Position, Move, PlayedGame
│   │   ├── game.ts               # game + create-input schemas, GameStatus
│   │   ├── http.ts               # health + error-envelope schemas
│   │   └── index.ts              # re-exports
│   └── rules/src/                # the rules engine (see §4c)
│       ├── board.ts              # square <-> coordinates, bounds, InvalidSquareError
│       ├── offsets.ts            # direction vectors per piece type
│       ├── fen.ts                # parseFen/toFen, STARTING_FEN, positionKey
│       ├── attacks.ts            # isSquareAttacked — never calls the generator
│       ├── moves.ts              # pseudo-legal generation + the legality filter
│       ├── apply.ts              # applyMove — pure, returns a new Position
│       ├── status.ts             # gameStatus: mate, stalemate, the draws
│       ├── perft.ts              # perft + divide, the debugging tool
│       ├── index.ts
│       └── __tests__/            # *.test.ts, plus *.perft.ts for depth 4
├── licenses/stockfish/           # GPLv3 text + attribution for the engine
├── docker-compose.yml            # Postgres 16
├── tsconfig.base.json            # strict flags inherited by every workspace
└── eslint.config.js              # single flat config for the whole repo
```

Workspace names: `@chess/api`, `@chess/web`, `@chess/shared`, `@chess/rules`. Filter with
`pnpm --filter @chess/api <script>`.

## 4. How the layers connect

```
GamesPage.tsx
  └─ TanStack Query  ──►  src/api/client.ts  ──►  fetch same-origin /api/*
                                │                          │
                     parses response with          Vite proxy (dev only)
                     @chess/shared Zod schema               ▼
                                                     Fastify :3000
                                                       routes/games.ts
                                                         │  validates body with the SAME schema
                                                         ▼
                                                     db.ts (Database interface)
                                                         ▼
                                              Prisma ──► Postgres :5432
```

**`packages/shared` is the contract.** Both sides validate against the same Zod schemas, so a
change there is a change to the API contract. Never duplicate a schema on one side.

It also holds the chess vocabulary — `Square`, `PieceType`, `PieceColor`, `Piece`, `Board`,
`Position`, `CastlingRights`, `Move`, `MoveFlag` — in `chess.ts`, which imports nothing at all. `@chess/rules` reads those types
and must stay free of anything that emits JavaScript, so **do not add a Zod schema or any other
import to `chess.ts`**; put it in a sibling file.

### Invariants — break these and things quietly rot

1. **Routes only touch the `Database` interface in `src/db.ts`.** They must never import
   `PrismaClient` directly. This seam is what makes the tests hermetic; losing it means `pnpm test`
   starts needing Docker.
2. **`buildApp()` never listens on a port.** Binding belongs to `server.ts` alone, so tests can use
   `app.inject()`.
3. **Dates cross the wire as ISO-8601 strings, never `Date`.** `toGameDto()` in `routes/games.ts`
   is the single conversion point. `GameRecord` (DB, `Date`) and `Game` (wire, `string`) are
   different types on purpose.
4. **Every non-2xx response uses the `{ error, message, details? }` envelope** (`apiErrorSchema`).
   The web client relies on it to build `ApiError`.
5. **Migrations are committed and applied with `prisma migrate deploy`.** Never `prisma db push`.
6. **`packages/shared` is compiled to `dist/`** with declarations. `pnpm -r build` orders it first
   automatically. If you see stale types in an app, rebuild it.
7. **Only `.env.example` files are committed.** Real `.env` files are gitignored. Every variable
   must be documented in the example with a safe placeholder.
8. **`/health` must never crash or hang when the database is down.** It catches, logs, and returns
   `503` with `db: "down"`.

### 4a. The chessboard (CHESS-2)

`components/board/` renders squares, coordinates and theme colours. It is purely presentational:
it holds no state, knows nothing about pieces or rules, and makes no API calls. Its rules:

- **`a1` is dark, `h1` is light.** Colour is `(fileIndex + rankIndex) % 2 === 0 → dark`, computed
  once in `squareAt()`. If the board ever looks inverted, fix that mapping — never CSS
  `nth-child` selectors downstream.
- **`orientation` reverses render order only.** `data-square="a1"` is always a1, whichever way the
  board faces. Bottom-left is `a1` for white and `h8` for black.
- **Themes are five CSS custom properties** (`--board-light`, `--board-dark`,
  `--board-light-coord`, `--board-dark-coord`, `--board-border`) set on the board root from the
  active theme object. Squares get their colour from `[data-color]` attribute selectors — never a
  per-theme class, a conditional class string, or a per-square inline colour. Adding an eleventh
  theme means editing `themes.ts` and nothing else.
- **Do not name a grid area that the active layout does not declare.** `grid-area: board` is scoped
  to `[data-coordinates='outside']`; applied unconditionally it creates implicit tracks and
  displaces the board. Likewise, the outside gutters use content-sized tracks — a `1fr` row cannot
  resolve an aspect-ratio-derived height and the board overflows it.
- **Labels size in `cqw`** against the board's own container, so they scale with the board and
  never with the viewport.
- **The `children` overlay layer exists for pieces** and for anything drawn over them, such as the
  move dots. Keep it, and keep it `pointer-events: none` — that is what lets a click on a piece
  reach the square underneath.
- **`onSquareClick` is the board's only concession to interaction.** One delegated listener on the
  board root resolves the click through `closest('[data-square]')` and reports the name. The board
  still holds no state, adds no DOM, and leaves squares `aria-hidden` under a single `role="img"`.
  Selection lives in the caller.

Coordinate labels intentionally fail WCAG 4.5:1 in 9 of 10 themes — the opposite-square rule puts
them at roughly 2–3.5:1 by construction. They are decorative (squares are `aria-hidden`, the board
root is a single `role="img"`), and the measured table is in the CHESS-2 PR. Do not "fix" the
contrast without deciding to change the visual design.

### 4b. The piece set (CHESS-3)

`components/pieces/` holds twelve SVG components and a dispatcher. Still no chess logic: pieces are
placed from a static map and nothing moves.

- **The twelve set components are the only place path data lives.** `Piece.tsx` dispatches on
  (set, colour, type) and draws nothing. If you find yourself adding a `<path>` outside
  `sets/*/`, stop.
- **Colour comes only from `--piece-white-fill` / `--piece-white-stroke` / `--piece-black-fill` /
  `--piece-black-stroke`**, never a literal. A test enforces this by walking every `fill`/`stroke`
  attribute, so a hardcoded hex fails the suite rather than shipping.
- **Black pieces are not white pieces with swapped fills.** Interior seams are redrawn as light
  strokes on black pieces; a dark seam on a dark fill is invisible.
- **The height ladder is load-bearing** (pawn 24 → king 38 from the `y = 40` baseline) and is
  verified by measuring rendered geometry, not by eye. A queen that reads as a bishop is a broken
  set.
- **Knights face the viewer's left in both colours.** The artwork is never mirrored — flipping the
  board moves pieces between cells and leaves every path untouched.
- Pieces render into the board's overlay layer, positioned by grid cell, so a change to the piece
  map cannot reflow the squares.

The hand-written `STARTING_LAYOUT` map is gone: the starting position is `parseFen(STARTING_FEN)`,
so there is one source of truth for it and it is the same one every test position uses.

`sets/meridian/README.md` records provenance (original work, no third-party licence) and the
drawing rules. Read it before touching the artwork.

Black pieces on **Midnight** and **Neon** are carried by their light interior seams, not by their
silhouette: with the specified defaults the black outline scores 1.03–2.91:1 against those squares.
Raised in the CHESS-3 PR. Per-theme piece tinting is a deliberate non-decision — do not add it
without a ticket.

### 4c. The rules engine (CHESS-4, CHESS-5)

`packages/rules` answers two questions: what are the legal moves in this position, and is the game
over? Nothing else — no evaluation, no search, no notation.

**The one architectural decision.** There is no pin detection here, no discovered-check detection,
and no "is this piece allowed to move" logic. Every move is generated by geometry, applied to a
copy of the position, and kept only if the mover's own king is not then attacked. That single rule
handles absolute pins, discovered check, moving into check, a king retreating along the checking
ray, being obliged to answer a check, double check, and the horizontal en-passant pin. Each of
those is a separate subtle function if detected directly, and all of them are free if simulated.
It is slower. Keep it — correctness is the requirement and speed is not.

- **The supported surface** is `legalMoves`, `legalMovesFrom`, `applyMove`, `gameStatus`,
  `isInCheck`, `isSquareAttacked`, `parseFen`/`toFen`. Everything else is exported for tests and
  the debugging tools; treat a change to it as free.
- **`isSquareAttacked` must never call the move generator**, even transitively. `legalMoves` calls
  _it_ to validate candidates, so the recursion would not terminate — and a pawn covers its
  diagonals whether or not a move there exists, so "can something move here" is the wrong question.
  It scans rays outward from the target square instead. A test in `packaging.test.ts` walks the
  import graph and fails if `attacks.ts` ever reaches `moves.ts`.
- **A king counts as an attacker.** That, and nothing else, is what keeps the two kings apart.
- **`applyMove` is pure** and returns a new `Position`. The legality filter depends on this: it
  applies moves purely, on the caller's position, thousands of times a second.
- **Castling's `empty` and `safe` square lists are deliberately different.** Queenside `b1` must be
  vacant but may be attacked, because the king never stands on it. Collapsing the two lists into
  one is a real bug that passes casual testing.
- **En passant removes a piece from a square other than `to`** — the only move in chess that does.
  Miss it and a ghost pawn survives; the perft counts catch it immediately.
- **A rook captured on its home square costs its owner that castling right.** The move that
  revokes it belongs to the other player, which is why it is easy to miss.
- **Promotion generates four moves, not one.** Under-promotion is legal, and its absence is
  visible in the perft numbers.
- **Zero runtime dependencies.** `@chess/shared` is a dependency for its _types_ only: every
  cross-package import is `import type`, so nothing — Zod included — reaches the emitted
  JavaScript. `packaging.test.ts` walks the sources and fails if a value import appears. This is
  why `board.ts` repeats the `FILES`/`RANKS` arrays instead of importing them.
- **Bounds checking lives in `toSquare` alone.** Out-of-range coordinates miss the `FILES`/`RANKS`
  arrays and come back `undefined`. Do not add a second `isOnBoard` test at the call sites.
- Coordinates are plain `{ file, rank }` integer pairs, 0-7 from a1. Not 0x88, not bitboards:
  performance is not a requirement and legibility is.
- **`GameStatus` here is the chess verdict**, computed from a position and never stored. The
  identically-named type in `@chess/shared` is the database column. Both names are right; they
  live in different packages so neither has to be wrong.

**Perft is the acceptance criterion.** Unit tests do not find the bugs in a rules engine. The five
standard positions are in `__tests__/positions.ts` with their published leaf counts; depths 1-3 run
in `pnpm test`, depth 4 in `pnpm test:perft` (about 90 seconds). When a count is wrong, do not read
the code — run `divide()` and compare per-root-move counts against a known-good source to find the
one subtree that diverges, then recurse into it.

`/board` is a hot-seat board: dots for quiet moves, rings for captures, a four-piece chooser for
promotions, and a status line. It exists because a rules engine cannot be reviewed any other way.
Its whole state is one `useState<Position>` — no API calls, no persistence, no undo.

### 4d. The engine integration (CHESS-6)

Stockfish 18 Lite runs in a Web Worker and reports an evaluation of the current position. It is
**analysis only**: it never plays a move and it never decides legality — `@chess/rules` remains
the sole authority on what is legal.

**Licensing is a design constraint here, not a footnote.** Stockfish is GPL-3.0-or-later, and
shipping the WASM build to the browser _is_ distribution. The full licence text and the
attribution live in `licenses/stockfish/`, and the engine is credited in the UI. If this project
ever needs to be closed-source, the engine has to move to an arms-length server-side process —
GPLv3 is not AGPL, so network use alone is not distribution. That is an architectural change.
Read `licenses/stockfish/NOTICE.md` before touching any of it.

- **The engine assets are copied, never bundled.** `scripts/copy-engine.mjs` runs at install and
  puts `stockfish-18-lite-single.{js,wasm}` into `public/engine/`, gitignored. The `.js` loader
  resolves its `.wasm` sibling relative to itself, so the pair must keep their real names in a
  real directory — importing them through Vite gets them hashed and the lookup breaks. Fighting
  the bundler over this is the single biggest time sink available in this area.
- **Pin the `stockfish` version exactly.** It is a large binary asset and the filenames carry the
  engine major version, so a silent minor bump is not something to discover in production.
- **Scores are normalised to White at the parser boundary.** UCI reports from the side to move's
  perspective, so a winning Black position reports _positive_ on Black's turn. `toWhitePerspective`
  negates it once and everything downstream is White-relative. Displayed raw, the bar flips meaning
  every move and looks plausible for about a week. Do not "fix" it.
- **`score mate N` is its own variant**, in moves and signed — not a very large centipawn value.
  Clamping it to ±10000 throws away the move count the UI shows.
- **Every command goes through `EngineClient`.** The engine is one stateful stream: changing an
  option or starting a second search mid-search hangs it. To change position, send `stop`, wait
  for the `bestmove` that acknowledges it, _then_ send `position` and `go`.
- **A generation counter guards against stale results.** Every search carries the generation it
  started under and `info` lines from a superseded one are dropped, or the tail of the previous
  search paints over the new position's eval.
- **`info` lines arrive dozens of times a second.** `useEngine` buffers the newest and flushes on
  `requestAnimationFrame`. Never `setState` per line.
- **`dispose()` is not optional.** An orphaned Stockfish worker saturates a core indefinitely.
- The eval bar fills by **win probability**, not centipawns — a linear bar spends its range on
  differences nobody can act on. Sigmoid, clamped at ±1000 cp.
- `uci.ts` is pure and Node-importable, which is why the parser tests need nothing spawned. That
  is where most of the value in this area is.

### 4e. Game review (CHESS-7)

`/review` labels every move of the played game and scores each side's accuracy.

**It will not match chess.com, and says so in the UI.** Their classification and accuracy
algorithms are proprietary and unpublished; nothing here reproduces them, and the two disagree
most visibly on Brilliant and Great. The note in the interface costs one line and heads off a
class of bug report that can never be resolved.

- **The game is state now.** `src/game/` holds `PlayedGame` — start position, moves, and the
  position after each — in a context above the routes, so `/review` reads what `/board` produced.
  Playing from anywhere but the end discards what followed; there is no variation tree and
  building one is not this ticket.
- **One pass, not two.** `analyseGame` evaluates every position exactly once: the eval before move
  `i` is `evals[i]`, the eval after is `evals[i + 1]`, and the engine's preference at `i` is
  `evals[i].lines[0].moves[0]`. Evaluating twice doubles a wait that is already the whole UX
  problem.
- **Strictly sequential, at a fixed depth.** Parallel workers exhaust memory on mobile and gain
  nothing on the single-threaded build. Varying depth makes classifications incomparable and
  invents blunders in endgames — use `go depth N`, never `movetime`.
- **Classification works in win probability, never centipawns.** A 100cp swing at level is a
  serious error; the same 100cp at +9 is meaningless, and centipawn thresholds call the second one
  a blunder. That is the whole design decision.
- **The mover's perspective is not White's.** The engine is normalised to White for display;
  classification flips it back for Black. Getting this wrong inverts every Black label and the
  output still looks sane, so there is a symmetric-fixture test.
- **Every tunable number is in `thresholds.ts`.** When labels feel wrong on real games — and they
  will — the fix is almost always a value in there rather than the code.
- **Accuracy uses Lichess's published constants**, including the `+ 1` the ticket's copy omitted;
  without it a flawless move scores 99.99991 instead of 100. Book and forced moves are excluded
  from the average. Lichess additionally weights by position volatility; that is a deliberate
  follow-up, not done here.
- **Badges must survive greyscale.** Several label colours sit close in hue, so every badge carries
  a distinct glyph as well. Same for the two board arrows: the engine's preference is dashed.
- Evaluations are cached by depth and FEN in a module-level `Map`, which is what makes re-reviewing
  a game instant.
- **No opening book.** The `book` label, its accuracy exclusion and its tests all exist, but
  nothing ever produces it — the ECO dataset was deferred, as the ticket permits. Adding it is
  wiring a source into one `isBook` flag.

## 5. Commands

Run from the repository root.

| Command           | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `pnpm install`    | Install everything (runs `prisma generate` via API postinstall) |
| `pnpm db:up`      | Start Postgres, wait for healthy                                |
| `pnpm db:migrate` | Apply committed migrations                                      |
| `pnpm dev`        | Build shared, then run API `:3000` and web `:5173` in parallel  |
| `pnpm build`      | Build all workspaces in dependency order                        |
| `pnpm test`       | Vitest everywhere — **needs no database and no Docker**         |
| `pnpm test:perft` | Depth-4 perft for the rules engine (~90s). Not part of `test`.  |
| `pnpm typecheck`  | `tsc --noEmit` across all workspaces, tests included            |
| `pnpm lint`       | ESLint over the repo                                            |
| `pnpm format`     | Prettier write (`format:check` in CI-style checks)              |
| `pnpm db:studio`  | Prisma Studio on `:5555`                                        |

New migration after editing `schema.prisma`:
`pnpm --filter @chess/api db:migrate:dev --name <name>`

**Before claiming a task is done, run:** `pnpm build && pnpm lint && pnpm test && pnpm typecheck`.
All four must pass. `pnpm format:check` too if you touched formatting.

## 6. Conventions

- **Import extensions differ by workspace.** `apps/api` and `packages/shared` use `NodeNext`
  resolution, so relative imports need explicit `.js` extensions (`./db.js`, even from `db.ts`).
  `apps/web` uses `Bundler` resolution — extensionless imports (`./App`). Copying an import style
  across that boundary will break the build.
- **Strict flags are strict.** `tsconfig.base.json` enables `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`. Indexing an
  array yields `T | undefined` — handle it rather than asserting.
- **Type-only imports must use `import type`** (`@typescript-eslint/consistent-type-imports` is an
  error). `import()` type annotations are banned; use `importOriginal<typeof Module>()` in
  `vi.mock`.
- **Prefer few well-named files over deep nesting.** Do not add abstraction layers with nothing to
  abstract. A new route goes in `routes/`; a new page in `pages/`.
- **Ports are fixed:** API `3000`, web `5173` (`strictPort`), Postgres `5432`, Studio `5555`. The
  Vite proxy forwards `/api` and `/health` to the API, so the browser is always same-origin in
  development and CORS never applies there.

## 7. Testing approach

- **API** (`apps/api/test/app.test.ts`): builds the real Fastify app with `buildApp({ db, logger:
false })`, passing `createFakeDatabase()` — an in-memory `Database`. Drives it with
  `app.inject()`. This exercises routing, Zod validation, status codes, and serialization with no
  infrastructure. `fake-db.setReachable(false)` simulates a stopped Postgres for the `/health` 503
  path.
- **Web** (`GamesPage.test.tsx`): `vi.mock`s `../api/client`, renders inside a fresh
  `QueryClientProvider` with `retry: false`, asserts on visible text via Testing Library.
- **Rules** (`packages/rules/src/__tests__/`): pure input/output, no harness, positions written as
  FEN. The load-bearing tests are the perft counts — see §4c. Alongside them sit the targeted
  regressions that survive low-depth perft: the en-passant horizontal pin, a king retreating along
  a check ray, double check, queenside castling past an attacked `b1`, and a rook captured on its
  home square. Run perft first when touching anything in that package.
- **Add tests at the same seam.** If you need a live database for a test, you are probably reaching
  past the `Database` interface — reconsider first.
- **Engine** (`apps/web/src/engine/*.test.ts`): the parsers are pure, so most of the coverage is
  there and costs nothing. `EngineClient` is tested against a scripted `EnginePort` — a fake that
  records commands and emits lines on cue — which is the entire reason the client talks to a port
  rather than to `Worker`. The real engine runs only under `pnpm test:engine`.
- **Review** (`apps/web/src/review/*.test.ts`): the classifier is developed against hand-written
  fixture evaluations, never a live engine. It is pure logic over numbers needing dozens of passes
  while thresholds are tuned, and waiting a minute for a real analysis between each would make
  that unbearable. The analyser is tested against a stub `Analyser`.
- **`pnpm test` reads `packages/*/dist`,** because the apps and the rules tests import
  `@chess/shared` as a built package. Build before testing — the documented order in §5 already
  does.

## 8. Gotchas already paid for

Do not rediscover these:

- `eslint-plugin-react-hooks` v7 exposes its flat config at `configs.flat['recommended-latest']`.
  Both `configs.recommended` and `configs['recommended-latest']` are legacy-shaped and crash ESLint 9.
- Fastify 5's `setErrorHandler` callback needs an explicit `FastifyError` annotation or `error`
  infers as `unknown` under these strict flags.
- pnpm 10 blocks dependency lifecycle scripts by default. Anything needing them must be listed
  under `onlyBuiltDependencies` in `pnpm-workspace.yaml` (currently Prisma and esbuild).
- Zod 4 spellings: `z.iso.datetime()` and `z.url()`, not the v3 `z.string().datetime()/.url()`.
- `apps/api` has a separate `tsconfig.check.json` so `pnpm typecheck` covers `test/` too, while
  `tsconfig.json` (used by `build`) emits only `src/`.
- The API reads `apps/api/.env` itself via `process.loadEnvFile` in `server.ts`, resolved relative
  to the module so it works identically from `src` (tsx) and `dist` (node).
- Board layout bugs are usually grid-sizing, not colour: see the two traps in §4a
  (unmatched `grid-area` names, and `1fr` tracks around an aspect-ratio box).
- The Stockfish WASM build writes its UCI output through `console.log`, bound when the module
  initialises. There is no usable `Module.print` hook outside a worker, which is why the
  integration harness runs it as a child process speaking UCI over stdio instead of loading it
  in-process. Loading it inside Vitest also puts it through the module transform and loses the
  `locateFile` override, so it hunts for the wrong `.wasm`.
- ESLint will happily lint the copied engine build in `apps/web/public/engine/`. It is in the
  ignore list; leave it there.
- jsdom does not implement container queries or `getComputedStyle` for CSS custom properties as a
  browser does. Assert board geometry and theme application in a real browser, not in Vitest —
  the component tests deliberately check DOM structure and attributes only.

## 9. Not implemented — separate tickets

PGN or SAN notation (`Nf3`, `O-O`, `e8=Q+`) — its own ticket · Stockfish as an **opponent** that
plays moves, which needs skill levels and time control that live analysis does not · persisting
reviews or games to Postgres — the natural next ticket, the `games` table is already there ·
natural-language move commentary · named openings and ECO codes · phase-based accuracy breakdowns
· estimated Elo or player-strength inference · puzzle extraction from missed tactics ·
hover-to-preview or click-to-explore of candidate lines · multi-threaded or full-size engine builds, and the cross-origin isolation
headers they require · opening books, tablebases, cloud evaluation, move ordering ·
draw offers, resignation, or claim-versus-automatic draw distinctions · clocks, time controls,
increments · move history, move list UI, undo/redo, navigating history · dragging and dropping
pieces · last-move or check highlight squares, arrows · persisting a game to the database or any
API endpoint · multiplayer, server-side move validation, turn enforcement across clients ·
performance work of any kind — no bitboards, no make/unmake in place, no memoisation · additional
piece sets (the registry is built for them; do not fill it) · captured-piece trays and material
counters · piece shadows, 3D, board perspective · authentication, users, sessions · WebSockets ·
matchmaking, lobbies, ratings · CI pipelines, app Dockerfiles, deployment config · sound ·
component libraries.

`/board` is a review affordance, not the game UI: one position in state, no history, nothing
persisted. Do not grow it here. Evaluations are likewise never cached, stored, or sent anywhere —
the engine runs in the browser and its output lives as long as the page does.

`GameStatus` already has `PENDING | ACTIVE | COMPLETED` and games carry two player names; that is
the extent of the domain modelling. Extend it deliberately, with a migration.

`Position` is the unit of game state, and it is exactly the six FEN fields. `GameStatus` in
`@chess/shared` (the database column) and `GameStatus` in `@chess/rules` (the computed verdict) are
different types with the same name on purpose — see §4c. Nothing connects the two yet; wiring the
engine to the API is a separate ticket with its own migration.

## 10. Keeping this file honest

A stale orientation doc is worse than none — future agents will trust it. Update it in the **same
commit** as the change when you:

- add, remove, or rename a workspace, or move a file this document points to;
- change the API surface, a shared schema, or the error envelope;
- change the Prisma schema or add a migration;
- add, remove, or change a root `package.json` script;
- change a port, an environment variable, or the dev proxy;
- break or deliberately change any invariant in §4;
- adopt or drop a dependency listed in §2;
- ship something out of §9 (move it into the "what exists" narrative).

When you finish a substantial task, re-read §1 and §9 and correct them if the repository has moved
on. Keep the tone factual: describe what _is_, not what is planned.
