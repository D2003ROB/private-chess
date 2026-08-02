# AGENTS.md

Orientation for AI agents (and humans) working in this repository. Read this before touching code.
If you change something this file describes, **update this file in the same commit** — see
[Keeping this file honest](#keeping-this-file-honest).

Last verified against commit: the CHESS-1 skeleton.

---

## 1. What this repository is right now

A full-stack skeleton for a chess application: React UI → Fastify API → Postgres.

**There is still no chess in it.** No rules, no legal-move generation, no pieces, no engine, no
authentication, no websockets. What exists is:

- a thin vertical slice — create and list game records — proving every layer is wired together
  (CHESS-1);
- a presentational chessboard at `/board`: squares, coordinates and 10 themes, holding no game
  state and knowing nothing about pieces (CHESS-2).

Treat that as deliberate. If a task asks you to add chess logic, it is new work under a new
ticket, not a gap to quietly fill.

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
│           │   ├── types.ts      # BoardTheme + component props
│           │   └── index.ts      # public exports
│           ├── pages/GamesPage.tsx         # route /
│           ├── pages/BoardPage.tsx         # route /board — board demo + picker
│           ├── test/setup.ts     # jest-dom + cleanup
│           └── styles.css        # global styles + site nav
├── packages/
│   └── shared/src/
│       ├── game.ts               # game + create-input schemas, GameStatus
│       ├── http.ts               # health + error-envelope schemas
│       └── index.ts              # re-exports
├── docker-compose.yml            # Postgres 16
├── tsconfig.base.json            # strict flags inherited by every workspace
└── eslint.config.js              # single flat config for the whole repo
```

Workspace names: `@chess/api`, `@chess/web`, `@chess/shared`. Filter with
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
- **The `children` overlay layer exists for pieces** to mount into later. Keep it.

Coordinate labels intentionally fail WCAG 4.5:1 in 9 of 10 themes — the opposite-square rule puts
them at roughly 2–3.5:1 by construction. They are decorative (squares are `aria-hidden`, the board
root is a single `role="img"`), and the measured table is in the CHESS-2 PR. Do not "fix" the
contrast without deciding to change the visual design.

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
- **Add tests at the same seam.** If you need a live database for a test, you are probably reaching
  past the `Database` interface — reconsider first.

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

Chess rules and move validation · pieces of any kind (glyphs, SVGs, piece sets) · FEN parsing or
rendering a position · click, drag, drop, selection or highlight behaviour on the board · any chess
engine or library (`chess.js`, Stockfish) · authentication, users, sessions · WebSockets and
real-time updates · matchmaking, lobbies, clocks, ratings · CI pipelines, app Dockerfiles,
deployment config · sound · component libraries.

`GameStatus` already has `PENDING | ACTIVE | COMPLETED` and games carry two player names; that is
the extent of the domain modelling. Extend it deliberately, with a migration.

Piece-set theming, when it lands, should reuse the theme-registry pattern in
`components/board/themes.ts` rather than inventing a second mechanism.

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
