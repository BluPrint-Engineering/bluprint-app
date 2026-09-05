# CLAUDE.md

BluPrint — construction-site management. Engineers map site issues as **pins over floor plans**, grouped by unit and by discipline, and export reports for the crews. React SPA + NestJS API in Bun workspaces; mobile-first, because the user is holding a phone inside an unfinished apartment.

## Answer from the document, not from the code

Most of this product is specified and not yet built, so the code will not tell you the rule. Open the section below, answer from it, and cite the `RF-xxx` / `RNF-xx` id or the `§` you used. Both sources of truth change by **pull request**, in the same PR as the code they govern — never by issue; an issue cites the id and links the file, it never copies the requirement text.

| You need | Open |
| --- | --- |
| A product rule, a permission, what a role may do — `RF-1xx` contas/licenciamento/papéis, `2xx` configuração da obra, `3xx` empresas executoras, `4xx` disciplinas e plantas, `5xx` pins, `6xx` unidade, `7xx` relatórios, `8xx` dashboards. RNFs sit in one flat table, no module mapping | `docs/requisitos.md`, the section matching the id's first digit |
| Why a product rule is that way, and what lost | `docs/requisitos.md` § Decisões estruturais — the de-facto ADR log; there is no `docs/adr/` |
| A domain word (obra, unidade, disciplina, papel efetivo, Geral), or a status/discipline hex | `docs/requisitos.md` § Vocabulário, § Paleta — the de-facto glossary; there is no `CONTEXT.md`. The two palettes are independent |
| Which library, runner or linter to use, and why the alternative lost | `docs/ARCHITECTURE.md` § A stack, § Por que cada escolha |
| Where a web file belongs; when it's promoted to `components/` or `packages/shared` | `docs/ARCHITECTURE.md` § Estrutura do front |
| Where an API file belongs; controller vs service vs `db/` | `docs/ARCHITECTURE.md` § Estrutura do back |
| Naming, and which language a given string is written in | `docs/ARCHITECTURE.md` § Nomenclatura, § Idioma |
| Where to host, which Postgres, which image storage | `docs/ARCHITECTURE.md` § Fora de escopo por enquanto — open on purpose. Settled: the API needs a long-lived process, so ephemeral-function hosts are out |
| What CI runs, and why it's ordered that way | `docs/ARCHITECTURE.md` § CI |
| Why a table or column is shaped that way | `docs/modelo-de-dados.md`, the section for that module — reasoning, not law; where it disagrees with a migration, the migration wins |
| The shared-schema contract for a new route (schema in `packages/shared`, DTO, response parsing) and the Bruno entry it needs | `packages/shared/src/health.ts` → `apps/api/src/health/` → `apps/web/src/features/health/` → `apps/api/bruno/health.bru` is the worked, complete example |
| Creating, labelling or closing an issue; the project board | `docs/agents/issue-tracker.md` § Repo label conventions, § GitHub Project |
| Which label marks a triage state | `docs/agents/triage-labels.md` |

## Five things that go wrong quietly

- **Language.** English for identifiers, files, routes, API error messages and commit subjects; pt-BR for every string a user reads (RNF-05) and everything in `docs/`. Most of `git log` is pt-BR — write the subject in English anyway, as Conventional Commits: `feat(api): connect local Postgres via Drizzle`.
- **DTOs are value imports, not type imports** — see `.claude/rules/api.md` for why this breaks at runtime, not compile time.
- **The database exists only on paper**, tracked in issue #5 — see `.claude/rules/db-schema.md` before touching `apps/api/src/db/` or a migration.
- **Issue labels and the board are manual.** Each issue gets exactly one `tipo:`, exactly one `prio:`, at least one `area:`, then `gh project item-add 3 --owner BluPrint-Engineering --url <url>`.
- **`gh pr create` skips the PR template.** Build the body from `.github/pull_request_template.md` — it's the checklist for what CI cannot verify. A block that doesn't apply is marked `n/a` and kept, never deleted.

## Conventions for one area

`.claude/rules/{api,web,db-schema}.md` load themselves when you read a file under their area. Read one directly when you're writing a new file from scratch there, or after a compaction — a debugging session that never opens a matching file won't trigger it on its own.

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
- **Domain docs** — single-context: `docs/requisitos.md` § Vocabulário is the glossary, § Decisões estruturais the decision log. See `docs/agents/domain.md`.

## Keeping this file lean

A line earns a place here only if it's **not derivable** from something an agent already opens (a manifest, a config, a doc section) **and invariant** — shipping a feature should never require editing this file. A PR that adds more than a line here says why in its description.
