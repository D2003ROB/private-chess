# AGENTS.md

Orientation for AI agents (and humans) working in this repository. Read this before touching code.
If you change something this file describes, **update this file in the same commit** — see
[Keeping this file honest](#keeping-this-file-honest).

Last verified against commit: the CHESS-4 movement rules.

---

## 1. What this repository is right now

A full-stack skeleton for a chess application: React UI → Fastify API → Postgres.

**There is barely any chess in it.** No captures, no check, no legality, no engine, no
authentication, no websockets. What exists is:

- a thin vertical slice — create and list game records — proving every layer is wired together
  (CHESS-1);
- a presentational chessboard at `/board`: squares, coordinates and 10 themes, holding no game
  state (CHESS-2);
- the Meridian piece set — twelve vector pieces drawn from scratch — rendered on the board from a
  static `STARTING_LAYOUT` map (CHESS-3);
- `@chess/rules`: quiet move generation for the six piece types — the geometry of movement and
  nothing else (CHESS-4). Still nothing moves; `/board` only draws dots where a piece could go.

Treat that as deliberate. If a task asks you to add chess logic beyond movement geometry, it is
new work under a new ticket, not a gap to quietly fill.

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
│           ├── components/pieces/ # the piece set (see §4b)
│           │   ├── sets/meridian/ # 12 components + manifest + README
│           │   ├── Piece.tsx     # dispatcher — never draws
│           │   ├── pieceSets.ts  # registry, mirrors themes.ts
│           │   ├── types.ts      # artwork-side types only
│           │   └── index.ts
│           ├── pages/GamesPage.tsx         # route /
│           ├── pages/BoardPage.tsx         # route /board — demo, picker, move inspector
│           ├── test/setup.ts     # jest-dom + cleanup
│           └── styles.css        # global styles + site nav
├── packages/
│   ├── shared/src/
│   │   ├── chess.ts              # Square, Piece, Board, STARTING_LAYOUT — no Zod
│   │   ├── game.ts               # game + create-input schemas, GameStatus
│   │   ├── http.ts               # health + error-envelope schemas
│   │   └── index.ts              # re-exports
│   └── rules/src/                # movement geometry (see §4c)
│       ├── board.ts              # square <-> coordinates, bounds, InvalidSquareError
│       ├── offsets.ts            # direction vectors per piece type
│       ├── moves.ts              # movesFor() and the one ray-walker behind it
│       ├── index.ts
│       └── __tests__/moves.test.ts
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
`STARTING_LAYOUT` — in `chess.ts`, which imports nothing at all. `@chess/rules` reads those types
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

`STARTING_LAYOUT` used to live here; it is now in `@chess/shared`, because `@chess/rules` needs it
and cannot import from `apps/`.

`sets/meridian/README.md` records provenance (original work, no third-party licence) and the
drawing rules. Read it before touching the artwork.

Black pieces on **Midnight** and **Neon** are carried by their light interior seams, not by their
silhouette: with the specified defaults the black outline scores 1.03–2.91:1 against those squares.
Raised in the CHESS-3 PR. Per-theme piece tinting is a deliberate non-decision — do not add it
without a ticket.

### 4c. The movement rules (CHESS-4)

`packages/rules` answers one question: given a board and a square, which squares can that piece
move to? Nothing else.

- **`movesFor(board, from)` is the only supported export.** `board.ts` and `offsets.ts` are
  exported for tests and may change freely; a change to `movesFor` is a breaking change.
- **Quiet moves only.** A destination must be empty. The occupied square that stops a ray is never
  returned, whichever colour sits on it, because that would be a capture. There is no check, pin,
  castling, en passant or promotion code — not even a stub or a commented placeholder. Adding any
  of it is a new ticket.
- **Zero runtime dependencies.** `@chess/shared` is a dependency for its _types_ only: every
  cross-package import is `import type`, so nothing — Zod included — reaches the emitted
  JavaScript. A test in `moves.test.ts` walks the sources and fails if a value import appears.
  This is why `board.ts` repeats the `FILES`/`RANKS` arrays instead of importing them.
- **`movesFor` is pure.** It never writes to the board, keeps no module-level state, and returns a
  fresh array sorted ascending (`a1`…`h8`) — which is plain `.sort()`, since a rank is one digit.
- **Six pieces, three behaviours.** One ray-walker does all of it: sliders walk seven steps,
  kings and knights walk one, and a pawn walks one — or two from its home rank. The pawn's blocked
  double step falls out of walking rather than being special-cased, and that is the point. If a
  change starts growing a per-piece switch with its own bounds checks, it is going the wrong way.
- **Bounds checking lives in `toSquare` alone.** Out-of-range coordinates miss the `FILES`/`RANKS`
  arrays and come back `undefined`. Do not add a second `isOnBoard` test at the call sites.
- Coordinates are plain `{ file, rank }` integer pairs, 0-7 from a1. Not 0x88, not bitboards:
  performance is not a requirement and legibility is.

`/board` renders a translucent dot on every square `movesFor` returns for the clicked piece. It is
a review affordance for a module with no visual output of its own — not the beginning of the game
UI, and the real interaction model may well replace it.

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
- **Rules** (`packages/rules/src/__tests__/moves.test.ts`): pure input/output, no harness. The
  load-bearing case is the starting position summing to exactly 20 moves a side — sixteen pawn
  moves and four knight moves. It fails loudly and specifically whenever the geometry breaks, so
  run it first when touching anything in that package.
- **Add tests at the same seam.** If you need a live database for a test, you are probably reaching
  past the `Database` interface — reconsider first.
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
- jsdom does not implement container queries or `getComputedStyle` for CSS custom properties as a
  browser does. Assert board geometry and theme application in a real browser, not in Vitest —
  the component tests deliberately check DOM structure and attributes only.

## 9. Not implemented — separate tickets

Captures, check, checkmate, pins and any other legality beyond movement geometry · castling, en
passant, promotion · turn order and whose move it is · move history, SAN, undo · FEN parsing or
loading an arbitrary position · dragging, dropping or actually relocating a piece · last-move or
check indicators, arrows · any chess engine or library (`chess.js`, Stockfish) · additional piece
sets (the registry is built for them; do not fill it) · captured-piece trays and material counters
· piece shadows, 3D, board perspective · authentication, users, sessions · WebSockets and
real-time updates · matchmaking, lobbies, clocks, ratings · CI pipelines, app Dockerfiles,
deployment config · sound · component libraries.

Selection exists on `/board` only as the move inspector described in §4c: one selected square, no
movement. Do not grow it into the game UI here.

`GameStatus` already has `PENDING | ACTIVE | COMPLETED` and games carry two player names; that is
the extent of the domain modelling. Extend it deliberately, with a migration.

`STARTING_LAYOUT` is a literal in `@chess/shared`, not parser output. When FEN parsing arrives it
should produce the same `Board` shape rather than replacing it.

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
