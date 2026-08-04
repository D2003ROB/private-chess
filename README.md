# private-chess

A full-stack skeleton for a chess application: a React UI talking to a Fastify API talking to
Postgres.

**This repository contains plumbing, a complete set of chess rules, and live engine analysis.**
`/board` is a playable hot-seat board over `@chess/rules`, which knows every legal move in any
position — captures, check, pins, castling, en passant, promotion — and when the game is over; it
is verified against the standard perft positions. Switching on analysis loads Stockfish 18 Lite
into a Web Worker and shows an eval bar, a score, the search depth and three candidate lines.

There is no computer opponent, no notation, no clock, and no game is persisted: the plumbing
proves one thin vertical slice — create and list game records — end to end, and the rules have not
been wired to it yet.

> **Licensing.** The bundled Stockfish engine is GPL-3.0-or-later, and shipping it to the browser
> is distribution. See [`licenses/stockfish/`](./licenses/stockfish/) before reusing this code
> commercially.

Working in this repository — as a person or an agent? Start with [AGENTS.md](./AGENTS.md): the
architecture, the invariants worth not breaking, and what is deliberately absent.

## Prerequisites

| Tool    | Version  | Notes                                           |
| ------- | -------- | ----------------------------------------------- |
| Node.js | ≥ 20 LTS | Verified on 22.x                                |
| pnpm    | ≥ 9      | `corepack enable pnpm` or `npm i -g pnpm`       |
| Docker  | any      | Only used to run Postgres 16 via Docker Compose |

## Quickstart

```bash
# 1. clone and enter the repository
git clone <repo-url> private-chess && cd private-chess

# 2. install every workspace's dependencies
pnpm install

# 3. copy the env examples (defaults work as-is for local development)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. start Postgres and wait for it to report healthy
pnpm db:up

# 5. apply the committed migration to the fresh database
pnpm db:migrate

# 6. start the API (:3000) and the web app (:5173)
pnpm dev
```

Then open <http://localhost:5173>. You should see the games page with an empty state; submitting
the form creates a game and the list refreshes on its own.

## Scripts

Run these from the repository root.

| Script              | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`          | Builds `@chess/shared`, then runs the API and web dev servers in parallel |
| `pnpm build`        | Builds every workspace in dependency order                                |
| `pnpm test`         | Runs Vitest in every workspace (no database required)                     |
| `pnpm test:perft`   | Depth-4 perft for the rules engine (~90 seconds), not run by `test`       |
| `pnpm test:engine`  | Drives the real Stockfish build, not run by `test`                        |
| `pnpm typecheck`    | `tsc --noEmit` across every workspace, tests included                     |
| `pnpm lint`         | ESLint over the whole repository                                          |
| `pnpm lint:fix`     | ESLint with `--fix`                                                       |
| `pnpm format`       | Prettier write                                                            |
| `pnpm format:check` | Prettier check                                                            |
| `pnpm db:up`        | Starts the Postgres container and waits for its healthcheck               |
| `pnpm db:down`      | Stops the Postgres container                                              |
| `pnpm db:migrate`   | Applies committed migrations (`prisma migrate deploy`)                    |
| `pnpm db:studio`    | Opens Prisma Studio on :5555                                              |
| `pnpm db:generate`  | Regenerates the Prisma client                                             |

To create a new migration after editing `schema.prisma`:

```bash
pnpm --filter @chess/api db:migrate:dev --name <migration-name>
```

## Project layout

```
.
├── apps/
│   ├── api/                    # Fastify 5 + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Game model + GameStatus enum
│   │   │   └── migrations/     # committed; never use `db push`
│   │   ├── src/
│   │   │   ├── app.ts          # buildApp() — wiring only, does not listen
│   │   │   ├── db.ts           # the narrow Database interface + Prisma impl
│   │   │   ├── env.ts          # Zod-validated environment
│   │   │   ├── server.ts       # entrypoint: builds the app and listens
│   │   │   └── routes/         # health.ts, games.ts
│   │   └── test/               # Fastify inject tests against an in-memory db
│   └── web/                    # React 19 + Vite + TanStack Query
│       └── src/
│           ├── api/client.ts   # typed fetch wrapper, parses with shared Zod
│           ├── components/     # board/, pieces/, game/, analysis/
│           ├── engine/          # Stockfish worker plumbing and UCI parsers
│           ├── pages/          # GamesPage.tsx, BoardPage.tsx and their tests
│           ├── App.tsx         # QueryClientProvider root
│           └── main.tsx
├── packages/
│   ├── shared/                 # Zod schemas, chess types, used everywhere
│   └── rules/                  # the rules engine: legalMoves, applyMove, gameStatus
├── licenses/stockfish/         # GPLv3 text and attribution for the engine
└── docker-compose.yml          # Postgres 16
```

`@chess/shared` is compiled to `dist/` with type declarations, so `pnpm -r build` builds it before
the apps that depend on it. During development `pnpm dev` builds it once up front; if you edit a
schema while the dev servers are running, rebuild it with
`pnpm --filter @chess/shared build` (or run that package's `dev` script for watch mode).

## API

| Method | Path             | Response                                             |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/health`        | `200 {status,db,uptime}`, or `503` with `db: "down"` |
| GET    | `/api/games`     | `200` — games, newest first                          |
| POST   | `/api/games`     | `201` with the created game, `400` on invalid input  |
| GET    | `/api/games/:id` | `200` with the game, `404` if unknown                |

Every non-2xx response uses the same envelope: `{ error, message, details? }`.

The Vite dev server proxies `/api` and `/health` to `http://localhost:3000`, so the browser only
ever talks to `:5173` and there is no CORS involved in development.

## Configuration

Environment variables are documented in the `.env.example` files — root (Postgres container),
`apps/api/.env.example`, and `apps/web/.env.example`. Real `.env` files are gitignored and must
never be committed. The API validates its environment at boot and exits with a readable message if
something is missing.

## Tests

```bash
pnpm test
```

Tests need no database and no Docker. The API tests build the real Fastify app via `buildApp()` and
drive it with `app.inject()`, passing an in-memory implementation of the `Database` interface — so
routes, Zod validation, status codes, and serialization are all exercised without infrastructure.

The rules engine is checked with perft: the five standard positions, counted to depth 3 in
`pnpm test` and to depth 4 in `pnpm test:perft`, which takes about 90 seconds and is deliberately
kept out of the default run.

The Stockfish integration is covered by pure parser tests and by an `EngineClient` driven against
a scripted fake worker. `pnpm test:engine` runs the same client against the real engine.
