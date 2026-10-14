# CI runs as parallel jobs behind a fan-in `ci`

Supersedes the single-job layout of [0018](0018-ci-runs-root-scripts.md), whose rule that CI calls the root scripts, and the order inside each job, stand; and the part of [0050](0050-playwright-for-end-to-end.md) that ran E2E inside the existing `ci` job.

The one serial `ci` job took about 190s on a pull request (lint, typecheck, build, tests, Playwright setup and e2e in sequence) and grew with every suite added. `.github/workflows/ci.yml` now has four jobs:

- `static`: `bun run lint`, `typecheck`, `build`, then `git diff --exit-code` on `routeTree.gen.ts`, in that order.
- `test`: a Postgres service, `db:migrate`, `bun run test`.
- `e2e`: a Postgres service, the Playwright browser cache and OS dependencies, `bun run e2e` ([0050](0050-playwright-for-end-to-end.md)).
- `ci`: `needs: [static, test, e2e]` with `if: always()`; it fails unless every needed job reports `success`.

`static`, `test` and `e2e` run in parallel, so the wall time is the slowest of them (`e2e`) instead of the sum.

## Consequences

- **The required check is still `ci`**, so branch protection is unchanged. It is the fan-in job, not the work: `static`, `test` and `e2e` also appear as checks but nothing requires them.
- **`ci` runs on failure and cancellation on purpose.** A required check that is skipped counts as passing, and a job whose `needs` failed is skipped unless it has `if: always()`. The job therefore checks `needs.*.result` itself, so a failed, cancelled or skipped job can never read as green.
- **[`deploy.yml`](../../.github/workflows/deploy.yml) is untouched.** `workflow_run` fires when the whole `CI` workflow completes, and a workflow only concludes `success` when every job did, including the fan-in.
- **Each database job has its own Postgres.** `test` and `e2e` no longer share state through one database; `DATABASE_URL`, `DATABASE_URL_TEST` and `DATABASE_URL_E2E` still all point at the runner's local `bluprint` database, which is private to the job.
- **The shared setup lives in `.github/actions/setup-workspace`**: Bun and Node pins, the Bun cache and `bun install`, so a version bump in CI is one edit and not three; `deploy.yml` keeps its own pins.
- **More runner minutes, not more cost.** Each job repeats the checkout, install and (for the database jobs) the Postgres pull; standard runners are free for a public repository.
- **`bun run e2e` still rebuilds shared, api and web**, so `e2e` does not depend on `static`'s build.

## Considered Options

- **Keep one job and trim steps**: the suites are the cost, and the sum keeps growing with them.
- **Make `static`, `test` and `e2e` the required checks**: changes branch protection, which is repository configuration and not reviewable in a pull request.
- **Chain the jobs with `needs`**: keeps the failure ordering and gives back the serial wall time.
