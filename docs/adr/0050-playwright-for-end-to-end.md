# Playwright for end-to-end tests

Vitest and Jest exercise components and modules in isolation ([0007](0007-jest-for-api-vitest-for-web.md)), but neither runs a real browser: the single-origin cookie ([0009](0009-single-origin-api-prefix-and-proxy.md)) needs the Vite proxy actually in front of a page, Better Auth's origin check needs a real `Origin` header, and Safari's cookie handling only shows up in WebKit, not jsdom. `apps/e2e` runs Playwright against the built web app and API — `iPhone 13` (WebKit) and `Desktop Chrome` — as the check that these hold together, and CI publishes its screenshots and traces as the evidence a PR review used to ask for by hand.

E2E runs inside the existing `ci` job, after `bun run test`, rather than a job of its own ([0018](0018-ci-runs-root-scripts.md)): a second job would re-run `bun install` and the Postgres service container for no gain, and CI stays one required check. One E2E test exists per user flow that crosses the browser boundary; everything else — validation, error mapping, business logic — stays in Vitest or Jest, where it is faster to write and to debug. `apps/e2e` runs against its own `bluprint_e2e` database and its own ports (3100/5273 by default), so a developer's `bun run dev` and `bun run e2e` can run at the same time without colliding.

The database is created, migrated and seeded by `prepare-database.ts`, run as a step of the `e2e` script (`bun prepare-database.ts && playwright test`) — **not** through Playwright's own `globalSetup`. Playwright starts `webServer` before running `globalSetup`, and the API's boot-time database check ([0006](0006-database-check-at-boot.md)) would crash the API process on a database that doesn't exist yet. This means `playwright test` or `playwright test --ui` run directly, instead of `bun run e2e`, skip database preparation.

The smoke test in `health.spec.ts` opens the health page anonymously; the first real flow is sign-in, and it will reuse a Playwright `storageState` captured once rather than signing in per test, because Better Auth rate-limits `/sign-in/email` to 5 attempts per minute per IP.

## Consequences

- `apps/e2e` builds `@bluprint/api` and `@bluprint/web` first, then starts them (`bun run start`, `vite preview`) as Playwright `webServer` entries — no `dev` server, no hot reload, closer to what ships.
- Its `package.json` has only `e2e` and `typecheck` scripts, deliberately without `test`: the root `test` script and Lefthook's pre-push job run every workspace's `test` script without a server or a database behind it.
- CI's Playwright browser cache is keyed on the resolved `@playwright/test` version, and OS-level browser dependencies are still installed on a cache hit, since only `~/.cache/ms-playwright` is cached, not `apt`'s state.

## Considered Options

- **Cypress**: comparable browser coverage, but no WebKit project, and this app's Safari cookie behavior is exactly the gap this suite exists to catch.
- **jsdom-only** (stay with Vitest/Testing Library for everything): what shipped before this ADR; it cannot exercise the proxy, real cookies or a real browser's origin check.
- **A separate CI job**: isolates E2E failures from the rest of the suite, at the cost of a second required check and a second Postgres service container for a database that already runs empty.
