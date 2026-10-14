# A push to `main` reruns only `static`

Narrows the trigger of the layout in [0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md): pull requests keep every job, a push to `main` runs one.

Branch protection requires a pull request to be up to date with `main` and history to be linear, so the tree a push produces is one that already passed `ci` on its pull request (39 of 39 sampled pushes). Rerunning `test` and `e2e` on it only delayed the deploy: merge to production took about 5.5 minutes instead of 2.5 to 3.

A push to `main` now runs `static` alone (install, `lint`, `typecheck`, `build`, the `routeTree.gen.ts` check) plus the **Playwright browser cache** step. `test`, `e2e` and the fan-in `ci` carry `if: github.event_name == 'pull_request'` and are skipped. [`deploy.yml`](../../.github/workflows/deploy.yml) is untouched: `workflow_run` still fires when the `CI` workflow completes and deploys only on `success`, which now means `static` passed, and a failed or cancelled `static` still deploys nothing.

## Consequences

- **`main` still has to run something, because of how Actions caches are scoped.** A cache created on a pull request is usable only by that pull request, and a new pull request restores the caches saved on `main`. If `main` stopped running jobs, a lockfile or Playwright version change would leave every later pull request installing from cold. `static` saves the Bun install cache through [`setup-workspace`](../../.github/actions/setup-workspace/action.yml) and the browser cache through [`setup-playwright`](../../.github/actions/setup-playwright/action.yml), which `e2e` also uses, so the key is written once and cannot drift between the saver and the restorer.
- **The browser cache is warmed without downloading it or the OS packages** (`warm-only: "true"`): `static` never launches a browser, so a hit only checks the key exists (`lookup-only`), and a miss installs the browsers for the post step to save. Only `~/.cache/ms-playwright` is cached, never the OS packages.
- **Pull requests are unchanged.** The same jobs, steps and required `ci` check run on a `pull_request`.
- **Direct pushes to `main` must be impossible**, since an untested tree would reach production through `static` alone. Branch protection enforces it for administrators too (`enforce_admins`, [0018](0018-ci-runs-root-scripts.md)); that is repository configuration and not reviewable here.
- **A skipped `ci` on a push is not a failure**: nothing requires a check on a push, and the workflow concludes `success` when its jobs are `success` or `skipped`.
- **Flaky or environment-dependent failures surface on the pull request, not after the merge.** A suite that only fails on `main` can no longer block a deploy, because nothing runs it there.

## Considered Options

- **Keep the full run on push**: re-tests a tree that already passed, and adds about 2.5 minutes to every deploy.
- **No run on push, deploy straight after the merge**: stops saving the caches pull requests restore, and deploys with no check that the merge commit builds.
- **A separate short job beside `static`**: duplicates the lint, typecheck and build steps, which would drift from the pull request's `static`.
