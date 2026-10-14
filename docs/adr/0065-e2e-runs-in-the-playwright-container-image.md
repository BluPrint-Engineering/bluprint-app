# The `e2e` job runs in the Playwright container image

Supersedes how [0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md) set Playwright up in `e2e` (a browser cache plus an `apt` step), and the browser-cache warming that [0064](0064-push-to-main-reruns-only-static.md) added to `static`.

`e2e` was the critical path of `ci` at about 100-140s, of which 30-48s (outliers up to 292s on a slow apt mirror) was `playwright install-deps` installing 181 OS packages on every run, even on a cache hit.

The job now declares `container: mcr.microsoft.com/playwright:v<version>-noble`, the image Playwright publishes with the browsers and their OS packages preinstalled. Nothing in the job downloads or installs a browser, and `.github/actions/setup-playwright` is removed along with the `static` step that warmed its cache.

## Consequences

- **The image tag is pinned by hand and checked against `bun.lock`.** A job's `container.image` cannot read a file, so the first step of `e2e` compares `job.container.image` with the `@playwright/test` version in `bun.lock` and fails with the line to change. A version bump that forgets the tag fails fast and by name rather than as a missing browser executable.
- **The Postgres service is reached at host `postgres`.** Inside a job container the service is a sibling on a Docker network, not a port on the runner's `localhost`. The job sets `DATABASE_URL`, `DATABASE_URL_TEST` and `DATABASE_URL_E2E` itself; the workflow-level values still serve `test`, which runs on the runner. The API and Vite servers Playwright starts live in the same container, so `localhost` for them is unchanged.
- **The seed's remote-host guard is satisfied, not bypassed.** `resolveSeedTarget` refuses any host but `localhost` until `SEED_ALLOW_HOST` names it and `SEED_PASSWORD` is set, so the job sets `SEED_ALLOW_HOST=postgres` and the fixture password the Playwright login uses. The target is the job's own throwaway service container.
- **Bun comes from npm in this job.** The image has no `unzip`, which `oven-sh/setup-bun` needs on a cache miss, so `setup-workspace` takes `bun-from-npm: "true"` and runs `npm install --global bun@1.4.0` instead; the other jobs keep `setup-bun`, and the version is still pinned in that one file.
- **Both projects, the retries and the report upload are untouched**: `iPhone 13` on WebKit, `Desktop Chrome`, `retries: 2` on CI, the `playwright-report` artifact, and the required check name `ci`.
- **`static` on a push to `main` no longer saves a browser cache.** Nothing restores one, so the step has no reason to exist; the Bun install cache that `setup-workspace` saves there is still what later pull requests restore.
- **The image is pulled on every run.** Its pull replaces the cache restore and the `apt` step; the trade is measured in the pull request that introduced it.
- **`--ipc=host`** is Playwright's documented option for Chromium in a container, so a small `/dev/shm` cannot crash it.

## Considered Options

- **Keep the cache and install the OS packages**: the 30s `apt` step runs on every hit and its mirror has a long tail.
- **Cache the OS packages too**: `apt` state is not relocatable, so a cache of it is fragile.
- **A custom image with Bun preinstalled**: another artifact to build, publish and keep patched, to save a few seconds of `setup-bun`.
