# CI runs the root scripts, in a deliberate order

`.github/workflows/ci.yml` has a single job, id `ci`, on every `pull_request` and on `push` to `main`. It calls the root scripts, not the tools behind them, so a new workspace needs no YAML edit and "passes here" and "passes there" are the same command. Order:

1. `bun install --frozen-lockfile`
2. `bun run lint`
3. `bun run typecheck`, **before** `build` on purpose: it exercises the **committed** `routeTree.gen.ts`, which is what a clean checkout and the editor see.
4. `bun run build`, then `git diff --exit-code` on `routeTree.gen.ts`, which fails if the committed file was stale.
5. `bun run --filter @bluprint/api db:migrate`, then `bun run test`.
6. `bun run e2e` (Playwright, [0050](0050-playwright-for-end-to-end.md)), after caching and installing its browsers.

## Consequences

- Postgres runs as a service container (`postgres:18-alpine`, `pg_isready` healthcheck). `DATABASE_URL`, `DATABASE_URL_TEST` and `DATABASE_URL_E2E` all point at the **same** database: the dev/test/e2e split only exists so a workspace never wipes a database holding hand-entered data, and the runner is born empty. `docker/postgres/init-test-db.sql` is not reproduced, because `services:` cannot mount repo files into `docker-entrypoint-initdb.d`, and it does not need to be.
- Pinned versions: Bun `1.4.0` and Node `24` (see [0014](0014-node-24-9-floor.md)).
- `BETTER_AUTH_SECRET` is set in `env:` with a throwaway value, because `envSchema` refuses to boot without it; `ALLOW_SELF_SIGNUP: "true"` for the reason in [0011](0011-self-signup-is-scaffolding.md).
- `permissions: contents: read` at the top. `pull_request_target` is never used: the repo is public, and that trigger runs fork code with the target repo's permissions.
- **Branch protection on `main` is repo configuration, not code**: it is not reviewable in a PR, and the check name is only selectable after the workflow has run green once. It is applied with the check required, `enforce_admins: true` (all three collaborators are admins) and zero required approvals (nobody approves their own PR, and so far every PR has had the same author).
- **Protection only exists because the repo is public** (since 04/09/2026, to unlock branch protection on the free plan). Going private without GitHub Pro turns it off **silently**.
