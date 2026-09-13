# BluPrint

Construction-site management. Engineers map site issues as pins over floor plans, grouped by unit and by discipline, and export reports for the crews.

React SPA + NestJS API in a Bun workspaces monorepo. Mobile-first, because the user is holding a phone inside an unfinished apartment.

## Getting started

Requires Bun and Node 24.9+ (the API runs on Node; Bun only runs the scripts).

```bash
cp .env.example .env   # fill in BETTER_AUTH_SECRET: openssl rand -base64 32
docker compose up -d --wait   # Postgres, once per session
bun install
bun run dev   # web on :5173, api on :3000
```

One `.env` at the repo root serves both apps; only `VITE_`-prefixed variables reach the browser.

## Commands

```bash
bun run test        # api Jest + web Vitest
bun run test:unit   # api only, no database needed
bun run test:int    # api only, boots against Postgres
bun run lint        # Biome everywhere except apps/api; ESLint + Prettier there
bun run typecheck   # also: build, lint:fix, format
bun run --filter @bluprint/api <script>              # one workspace; db:generate and db:migrate live here
bun run --filter @bluprint/api test -- -t "<name>"   # single test; web uses bunx vitest run -t "<name>"
```

Every root script builds `packages/shared` first, because both apps consume it from `dist/`; run `bun run --filter @bluprint/shared build` once before a bare `bunx vitest` or `tsc` inside a workspace, or `@bluprint/shared` fails to resolve.

## Project structure

```
apps/
├── web/              React SPA (Vite)
└── api/              NestJS API on Node; bruno/ holds the API collection, drizzle/ the migrations
packages/shared/       Zod schemas and types both apps agree on; built to dist/ before anything else
docs/                  ARCHITECTURE.md, data-model.md, requisitos.md (pt-BR product spec), adr/, agents/
docker/postgres/       init script that creates the test database
CONTEXT.md             domain glossary
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full map and [`docs/adr/`](docs/adr/) for why each decision was made.

## Documentation

| You need | Open |
| --- | --- |
| A domain word (project, unit, discipline, effective role, General) and its pt-BR equivalent | [`CONTEXT.md`](CONTEXT.md) |
| Why something is the way it is, and what lost | [`docs/adr/`](docs/adr/) |
| Where a file belongs, the stack, naming, commits | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Why a table or column is shaped that way | [`docs/data-model.md`](docs/data-model.md) |
| The product spec (pt-BR, `RF-xxx`/`RNF-xx` ids) | [`docs/requisitos.md`](docs/requisitos.md) |

A decision, the architecture or the spec changes by pull request, in the same PR as the code it governs.
