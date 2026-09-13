# CLAUDE.md

BluPrint — construction-site management. Engineers map site issues as **pins over floor plans**, grouped by unit and by discipline, and export reports for the crews. React SPA + NestJS API in Bun workspaces; mobile-first, because the user is holding a phone inside an unfinished apartment.

## Where to look

Most of the product is specified but not built, so the code will not always tell you the rule. Open the one file that answers the question; each is small on purpose.

| You need | Open |
| --- | --- |
| A domain word (project, unit, discipline, effective role, General) and its pt-BR equivalent | `CONTEXT.md` |
| Why something is the way it is, and what lost | `docs/adr/` — `ls` the titles, open the one that matches |
| Where a file belongs, the stack, naming, commits | `docs/ARCHITECTURE.md` |
| Why a table or column is shaped that way | `docs/data-model.md` — reasoning, not law; the migration wins |
| The shared-schema contract for a new route | `packages/shared/src/health/` → `apps/api/src/health/` → `apps/web/src/features/health/` → `apps/api/bruno/health.bru`, the complete worked example |
| Creating, labelling or closing an issue; the project board | `docs/agents/issue-tracker.md` |
| The product spec (pt-BR, `RF-xxx`/`RNF-xx` ids) | `docs/requisitos.md` — only when refining or breaking down tickets, or when an issue cites an id |

A decision, the architecture or the spec changes by **pull request**, in the same PR as the code it governs — a new ADR, never an issue.

## Five things that go wrong quietly

- **Language.** English everywhere — code, comments, docs, commit subjects, API error messages. pt-BR only for strings a user reads and for `docs/requisitos.md`. Commits are Conventional Commits: `feat(api): connect local Postgres via Drizzle`.
- **DTOs are value imports, not type imports** — see `.claude/rules/api.md` for why this breaks at runtime, not compile time.
- **Only `organization`, `member`, `license`, `project` and `project_member` exist beyond Better Auth's four**; the rest of `docs/data-model.md` is designed but not migrated — see `.claude/rules/db-schema.md` before touching `apps/api/src/db/` or a migration.
- **Issue labels and the board are manual.** Each issue gets exactly one `tipo:`, exactly one `prio:`, at least one `area:`, then `gh project item-add 3 --owner BluPrint-Engineering --url <url>`.
- **`gh pr create` skips the PR template.** Build the body from `.github/pull_request_template.md` — it's the checklist for what CI cannot verify. A block that doesn't apply is marked `n/a` and kept, never deleted.

## Conventions for one area

`.claude/rules/{api,web,db-schema,code-comments}.md` load themselves when you read a file under their paths. Read one directly when writing a new file from scratch there, or after a compaction.

## Commands

```bash
docker compose up -d --wait  # Postgres, once per session — serves dev and the integration tests
bun run dev                  # web :5173, api :3000
bun run test                 # api Jest + web Vitest; test:unit and test:int are api-only
bun run lint                 # Biome everywhere except apps/api; ESLint + Prettier there
bun run typecheck            # also: build, lint:fix, format
bun run --filter @bluprint/api <script>              # one workspace; db:generate and db:migrate live here
bun run --filter @bluprint/api test -- -t "<name>"   # single test; web uses bunx vitest run -t "<name>"
```

Every root script builds `packages/shared` first, because both apps consume it from `dist/`; run `bun run --filter @bluprint/shared build` once before a bare `bunx vitest` or `tsc` inside a workspace, or `@bluprint/shared` fails to resolve and reads like a broken import path. One `.env` at the repo root serves both apps — copy `.env.example`; only `VITE_`-prefixed vars reach the browser.

## Agent skills

- **Issue tracker** — GitHub issues in `BluPrint-Engineering/bluprint-app`, via `gh`. See `docs/agents/issue-tracker.md`.
- **Triage labels** — five triage states as a `triagem:` axis, plus `wontfix`. See `docs/agents/triage-labels.md`.
- **Domain docs** — single-context: `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Keeping this file lean

A line earns a place here only if it's **not derivable** from something an agent already opens (a manifest, a config, a doc section) **and invariant** — shipping a feature should never require editing this file. A PR that adds more than a line here says why in its description.
