# `test` splits into `test-api` and `test-web`

Amends the job list of [0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md): its `test` job is replaced by two; the rest stands.

`test` ran Jest and Vitest in one job, sharing four vCPUs, and the web suite waited on a Postgres service it never uses. `.github/workflows/ci.yml` now has:

- `test-api`: a Postgres service, `db:migrate`, `bun run test:api`.
- `test-web`: no service, `bun run test:web`.

Both feed the fan-in `ci` (`needs: [static, test-api, test-web, e2e]`), so the required check name is unchanged.

## Consequences

- **Two root scripts**, `test:api` and `test:web`, each building `@bluprint/shared` first, because CI calls root scripts ([0018](0018-ci-runs-root-scripts.md)). `bun run test` remains the local run of everything.
- **A new workspace with tests must be added to one of them**: CI no longer calls the catch-all `bun run test`. Only `api` and `web` have a `test` script today.
- **Each job repeats checkout and install**; standard runners are free for a public repository ([0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md)).

## Considered Options

- **Keep one job**: the web suite stays on the same CPUs as Jest and behind Postgres.
- **`test-web` as `bun run test` minus the api**: new workspaces stay automatic, but the job is named after one workspace while it runs several.
