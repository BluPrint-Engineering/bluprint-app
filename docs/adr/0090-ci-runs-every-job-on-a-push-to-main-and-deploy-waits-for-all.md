# CI runs every job on a push to `main`, and deploy waits for all of them

Supersedes [0064](0064-push-to-main-reruns-only-static.md).

0064 skipped `test` and `e2e` on a push to `main`, on the grounds that branch protection makes the pushed tree one that already passed `ci` on its pull request (39 of 39 sampled pushes). That holds for a tree that was up to date when its pull request ran, but not for two pull requests that each passed against an older `main` and merged close together, or for a failure that only the merge produces. The release gate was in effect lint, typecheck and build: a red suite could not stop a deploy, because nothing ran it.

A push to `main` now runs the same jobs as a pull request: `static`, `test-api`, `test-web`, `e2e` and the fan-in `ci` ([0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md), [0091](0091-test-splits-into-test-api-and-test-web.md)). [`deploy.yml`](../../.github/workflows/deploy.yml) still fires on `workflow_run` and deploys the commit CI approved, but its first job, `gate`, now requires the `ci` job of that run to have concluded `success`; `api` needs `gate`.

## Consequences

- **The gate checks the fan-in itself.** A workflow concludes `success` when its jobs are `success` or `skipped`, so a skipped or removed fan-in would still let the workflow read green. `gate` reads the run's jobs and fails unless the one named `ci` is `success`, so a red or skipped suite can never reach production.
- **Merge to production takes as long as the full run.** About 2.5 to 3 minutes of CI before, the pull request's wall time now (about 10 minutes while `sessionRestore.test.tsx` dominates `test-web`), plus the deploy. That is the price of deploying only a tested tree.
- **A run on `main` is not cancelled by the next merge.** `cancel-in-progress` is on for pull requests only: a cancelled run has no verdict, and a burst of merges could starve the deploy. GitHub keeps one pending run per concurrency group, so a burst still collapses to the newest commit, as in [0059](0059-first-deploy-neon-fly-pages.md).
- **Flaky or environment-dependent failures now block a deploy.** They are fixed, not rerun away; a red `main` is unblocked by re-running the failed jobs.
- **The Bun install cache is still saved on `main`**, now by `static`, `test-api` and `test-web` under one key; a loser of the save race only logs a warning.
- **Branch protection is unchanged**: `ci` stays the only required check.

## Considered Options

- **Keep 0064**: leaves the release gate at lint and build.
- **Deploy from a job in `ci.yml` after `needs: ci`**: puts the deploy under CI's concurrency group and on the pull request's workflow behind `if` guards; 0059 chose `workflow_run` and its own non-cancelling group.
- **A merge queue**: would test the merge result before it lands, but is repository configuration and not reviewable here; deferred while this run covers it.
