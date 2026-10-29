# AGENTS.md

BluPrint — construction-site management. Engineers map site issues as **pins over floor plans**, grouped by unit and by discipline, and export reports for the crews. React SPA + NestJS API in Bun workspaces; mobile-first, because the user is holding a phone inside an unfinished apartment.

## Where to look

Most of the product is specified but not built, so the code will not always tell you the rule. Open the one file that answers the question; each is small on purpose.

| You need | Open |
| --- | --- |
| A domain word (project, unit, discipline, effective role, General) and its pt-BR equivalent | `CONTEXT.md` |
| Why something is the way it is, and what lost | `docs/adr/` — `ls` the titles, open the one that matches |
| Where a file belongs, the stack, naming, commits | `docs/ARCHITECTURE.md` |
| Why a table or column is shaped that way | `docs/data-model.md` — reasoning, not law; the migration wins |
| The shared-schema contract for a new route | `packages/shared/src/projects/` → `apps/api/src/projects/`, documented at `/api/docs` — the complete worked example |
| Creating, labelling or closing an issue; the project board | `docs/agents/issue-tracker.md` |
| The product spec (pt-BR, `RF-xxx`/`RNF-xx` ids) | `docs/requisitos.md` — only when refining or breaking down tickets, or when an issue cites an id |

Decisions, architecture and product requirements change by **pull request**, in the same PR as the code they govern, with a new ADR. Visual screen specs live as issue artifacts.

## Five things that go wrong quietly

- **Language.** English everywhere — code, comments, docs, commit subjects, API error messages. pt-BR only for strings a user reads and for `docs/requisitos.md`. Commits are Conventional Commits: `feat(api): connect local Postgres via Drizzle`.
- **DTOs are value imports, not type imports** — see `.claude/rules/api.md` for why this breaks at runtime, not compile time.
- **Only part of `docs/data-model.md` is migrated**; `apps/api/src/db/schema.ts` and the migrations list what exists, the rest is designed only — see `.claude/rules/db-schema.md` before touching an `*.entity.ts`, `apps/api/src/db/` or a migration.
- **Issue labels and the board are manual.** Each issue gets exactly one `tipo:`, exactly one `prio:`, at least one `area:`, then `gh project item-add 3 --owner BluPrint-Engineering --url <url>`.
- **`gh pr create` skips the PR template.** Build the body from `.github/pull_request_template.md` — it's the checklist for what CI cannot verify. A block that doesn't apply is marked `n/a` and kept, never deleted. An interface change carries its captures: `.claude/rules/web.md`.

## Conventions for one area

Before touching an area, read its rules: `.claude/rules/api.md` (`apps/api`), `web.md` (`apps/web`), `db-schema.md` (`*.entity.ts`, `apps/api/src/db/`, migrations). Claude Code loads them itself when you read a file under their paths; other agents must open them. `.claude/rules/code-comments.md` governs every comment you write, in any file: read it first.

## Commands

```bash
docker compose up -d --wait  # Postgres, once per session — serves dev and the integration tests
bun run dev                  # web :5173, api :3000 by default; a worktree gets its own from .env.local
bun run test                 # api Jest + web Vitest; test:unit and test:int are api-only
bun run lint                 # Biome everywhere except apps/api; ESLint + Prettier there
bun run typecheck            # also: build, lint:fix, format
bun run --filter @bluprint/api <script>              # one workspace; db:generate, db:migrate and db:seed live here
bun run --filter @bluprint/api test -- -t "<name>"   # single test; web uses bunx vitest run -t "<name>"
bun run e2e                  # Playwright on :3100/:5273 by default (a worktree gets its own from .env.local) against bluprint_e2e; builds first
```

Every root script builds `packages/shared` first, because both apps consume it from `dist/`; run `bun run --filter @bluprint/shared build` once before a bare `bunx vitest` or `tsc` inside a workspace, or `@bluprint/shared` fails to resolve and reads like a broken import path. One `.env` at the repo root serves both apps — copy `.env.example`; only `VITE_`-prefixed vars reach the browser.

## Agent skills

- **Issue tracker** — GitHub issues in `BluPrint-Engineering/bluprint-app`, via `gh`. See `docs/agents/issue-tracker.md`.
- **Triage labels** — five triage states as a `triagem:` axis, plus `wontfix`. See `docs/agents/triage-labels.md`.
- **Domain docs** — single-context: `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Keeping this file lean

A line earns a place here only if it's **not derivable** from something an agent already opens (a manifest, a config, a doc section) **and invariant** — shipping a feature should never require editing this file. A PR that adds more than a line here says why in its description.
