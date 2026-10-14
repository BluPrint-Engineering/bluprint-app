# The `e2e` job runs in the Playwright container image

Supersedes how [0061](0061-ci-runs-as-parallel-jobs-behind-a-fan-in-ci.md) set Playwright up in `e2e` (a browser cache plus an `apt` step), and the browser-cache warming that [0064](0064-push-to-main-reruns-only-static.md) added to `static`.

`e2e` was the critical path of `ci` at about 100-140s, of which 30-48s (outliers up to 292s on a slow apt mirror) was `playwright install-deps` installing 181 OS packages on every run, even on a cache hit.

The job now declares `container: mcr.microsoft.com/playwright:v<version>-noble`, the image Playwright publishes with the browsers and their OS packages preinstalled. Nothing in the job downloads or installs a browser, and `.github/actions/setup-playwright` is removed along with the `static` step that warmed its cache.

## Consequences

- **The image tag is pinned by hand and checked against `bun.lock`.** A job's `container.image` cannot read a file, and the `job` context does not expose it, so the first step of `e2e` compares the Playwright version the image records in `$PLAYWRIGHT_BROWSERS_PATH/.docker-info` with the `@playwright/test` version in `bun.lock` and fails with the line to change. A version bump that forgets the tag fails fast and by name rather than as a missing browser executable.
- **The Postgres service is reached at host `postgres`.** Inside a job container the service is a sibling on a Docker network, not a port on the runner's `localhost`. `DATABASE_URL_E2E`, the only database variable `e2e` reads, is set on the job itself; the workflow-level `DATABASE_URL` and `DATABASE_URL_TEST` serve `test`, which runs on the runner. The API and Vite servers Playwright starts live in the same container, so `localhost` for them is unchanged.
- **The seed's remote-host guard is satisfied, not bypassed.** `resolveSeedTarget` refuses any host but `localhost` until `SEED_ALLOW_HOST` names it and `SEED_PASSWORD` is set, so the job sets `SEED_ALLOW_HOST=postgres`, and `apps/e2e/prepare-database.ts` hands the seed the password the Playwright login uses, so it has one source. The target is the job's own throwaway service container.
- **Bun comes from npm in this job.** The image has no `unzip`, which `oven-sh/setup-bun` needs on a cache miss, so `setup-workspace` takes `job-container: "true"` and runs `npm install --global bun@<version>` instead; the other jobs keep `setup-bun`, and both read the version from the one step in that file that pins it.
- **The checkout is marked `safe.directory` before `bun install`.** The container runs as root over a workspace the runner user owns, and `actions/checkout` drops the exception it adds once it ends, so git 2.43 in the image refuses the repository with "detected dubious ownership" and the root `prepare` script, `scripts/install-hooks.sh`, fails on `git rev-parse`. `setup-workspace` adds `$GITHUB_WORKSPACE` to the global `safe.directory` when `job-container` is set, so the hooks install the same way as on the runner.
- **`e2e` installs dependencies without the Bun install cache, because a cold install is faster there.** The image has no `zstd` either, so `actions/cache` falls back to gzip: it cannot restore the zstd archive the runner jobs save, and an archive of its own is slower than a cold `bun install`. Measured in `mcr.microsoft.com/playwright:v1.63.0-noble` (x86_64, 8 CPUs, Bun 1.4.0, this `bun.lock`), three runs each:

  | Path | Time |
  | --- | --- |
  | Cold `bun install --frozen-lockfile` | 6.7s, 5.3s, 5.3s |
  | Cache restore (gzip `tar -xz` of 253 MB) + warm install | 9.8s + 1.3s, 8.9s + 0.6s, 9.5s + 0.6s |
  | Cache save (gzip `tar -cz` of the 996 MB cache) | 36.0s, once per new `bun.lock` |

  The restore figure leaves out downloading the 253 MB archive, which a real restore adds. Commands, run inside the image with the repository's `package.json` files and `bun.lock` copied to `/work` (`--ignore-scripts` only because the copy omits `scripts/install-hooks.sh`, which both paths run alike in CI):

  ```bash
  npm install --global bun@1.4.0
  rm -rf ~/.bun/install/cache node_modules apps/*/node_modules packages/*/node_modules
  time bun install --frozen-lockfile --ignore-scripts                     # cold
  time tar -cz -f /tmp/cache.tgz -P -C /work ~/.bun/install/cache         # save
  rm -rf ~/.bun/install/cache node_modules apps/*/node_modules packages/*/node_modules
  time tar -xz -f /tmp/cache.tgz -P -C /work                              # restore
  time bun install --frozen-lockfile --ignore-scripts                     # warm
  ```

- **Both projects, the retries and the report upload are untouched**: `iPhone 13` on WebKit, `Desktop Chrome`, `retries: 2` on CI, the `playwright-report` artifact, and the required check name `ci`.
- **`static` on a push to `main` no longer saves a browser cache.** Nothing restores one, so the step has no reason to exist; the Bun install cache that `setup-workspace` saves there is still what `static` and `test` restore on later pull requests.
- **The image is pulled on every run.** Its pull replaces the browser-cache restore and the `apt` step. The linux/amd64 image is 956 MB compressed (the sum of the 7 layer sizes in its `docker manifest inspect` manifest) and 3.55 GB on disk (`docker images`). `docker pull mcr.microsoft.com/playwright:v1.63.0-noble` took 4m30.5s wall time with Docker 29.8.0 on 2026-10-14, measured on a home network: that figure is not representative of a GitHub runner, and no runner figure is derived from it. The pull time on a GitHub runner and the net change in `e2e` job duration are measured on the pull request's first CI run and reported with the task, not here.
- **`--ipc=host`** is Playwright's documented option for Chromium in a container, so a small `/dev/shm` cannot crash it.

## Considered Options

- **Keep the cache and install the OS packages**: the 30s `apt` step runs on every hit and its mirror has a long tail.
- **Cache the OS packages too**: `apt` state is not relocatable, so a cache of it is fragile.
- **A custom image with Bun preinstalled**: another artifact to build, publish and keep patched, to save a few seconds of `setup-bun`.
