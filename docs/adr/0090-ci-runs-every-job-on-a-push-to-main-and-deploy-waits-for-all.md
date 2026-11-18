# CI runs every job on a push to `main`, and deploy waits for all of them

Supersedes [0064](0064-push-to-main-reruns-only-static.md).

0064 skipped `test` and `e2e` on a push to `main`, on the grounds that branch protection makes the pushed tree one that already passed `ci` on its pull request (39 of 39 sampled pushes). That left the release gate in effect lint, typecheck and build: a red suite could not stop a deploy, because nothing ran it on the commit being deployed. Whether a suite ran at all depended on branch-protection settings that live outside the repository, where no pull request can review or enforce them.

A push to `main` now runs the same jobs as a pull request: `static`, `test-api`, `test-web`, `e2e` and the fan-in `ci` ([0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md), [0091](0091-test-splits-into-test-api-and-test-web.md)). [`deploy.yml`](../../.github/workflows/deploy.yml) still fires on `workflow_run` when that run concludes `success`, which the `if: always()` fan-in makes impossible while any job is red or skipped, and deploys the commit CI approved. Its first job, `gate`, deploys that commit only if it is still the tip of `main`; otherwise it logs a notice and `api` and `web` are skipped.

## Consequences

- **Only the tip of `main` deploys.** A re-run of an older run that turns green, or an older run that finishes after a newer commit landed, never deploys over a newer commit whose migrations already ran. The newer commit carries the older one's changes and deploys from its own run.
- **A rollback is a revert commit on `main`**, which goes through the full run like any other change; re-running an old run no longer redeploys its commit ([0059](0059-first-deploy-neon-fly-pages.md)).
- **Merge to production takes as long as the full run.** About 2.5 to 3 minutes of CI before, the pull request's wall time now (about 10 minutes while `sessionRestore.test.tsx` dominates `test-web`), plus the deploy. That is the price of deploying only a tested tree.
- **A run on `main` is not cancelled by the next merge.** `cancel-in-progress` is on for pull requests only: a cancelled run has no verdict, and a burst of merges could starve the deploy. GitHub keeps one pending run per concurrency group, so a burst still collapses to the newest commit, as in [0059](0059-first-deploy-neon-fly-pages.md).
- **Flaky or environment-dependent failures now block a deploy.** They are fixed, not rerun away; re-running the failed jobs unblocks a red `main` only on its newest run, the only one that can deploy.
- **The Bun install cache is still saved on `main`**, now by `static`, `test-api` and `test-web` under one key; a loser of the save race only logs a warning.
- **Branch protection is unchanged**: `ci` stays the only required check.

## Considered Options

- **Keep 0064**: leaves the release gate at lint and build.
- **Deploy from a job in `ci.yml` after `needs: ci`**: puts the deploy under CI's concurrency group and on the pull request's workflow behind `if` guards; 0059 chose `workflow_run` and its own non-cancelling group.
- **A merge queue**: would test the merge result before it lands, but is repository configuration and not reviewable here; deferred while this run covers it.
