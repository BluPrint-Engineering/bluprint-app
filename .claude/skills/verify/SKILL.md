---
name: verify
description: Launch, health-check, drive and tear down the BluPrint web app (React SPA + NestJS API + Postgres) the way a user on a phone or desktop does, and capture screenshot, video, trace and database evidence. Use to prove a change works end to end in the running app, to reproduce a UI or API bug, or when asked to run, start or screenshot BluPrint.
---

# Verify BluPrint end to end

BluPrint's surface is the web app: a user signs in at `/login`, lands on `/projects` (Obras) and works from there, mostly on a phone. The API has no UI of its own beyond `/api/docs`; drive it through the web app, which proxies `/api` to it.

This skill runs the same production build `bun run e2e` uses, on the E2E ports and database, so it never collides with the developer's `bun run dev` (:5173/:3000) or with another worktree. Two helpers do the work, both run from the repo root:

- `bun .claude/skills/verify/scripts/instance.ts up|doctor|down` starts, checks and stops one instance per checkout.
- `bun .claude/skills/verify/scripts/drive.ts <journey.ts> [--device phone|desktop|both] [--as admin|manager|none] [--out <dir>]` runs a journey in Playwright and records evidence.

The feature map in [`features/README.md`](features/README.md) is the recipe book: read it, pick the feature your change touches, and drive every entry point it lists.

## Launch

1. Postgres must answer on `localhost:5432`. If it does not, start the shared container with `docker compose up -d --wait`. Every worktree shares it: never `stop`, `down` or remove it, its volume or a database you did not create.
2. `bun .claude/skills/verify/scripts/instance.ts up`. It:
   - in a linked git worktree without `.env.local`, runs `bun run worktree:setup` (ADR 0049), which picks a slot and creates this worktree's databases;
   - builds `packages/shared`, the API and the web app (`VITE_ALLOW_SELF_SIGNUP=true`), as `bun run e2e` does;
   - runs `apps/e2e/prepare-database.ts`, which creates the E2E database if missing, migrates it and reseeds it from `apps/api/src/db/seed/fixture.ts` (the seed truncates, so every `up` starts from the same data);
   - starts the API (`bun run start` in `apps/api`) and `vite preview` (in `apps/web`) in their own process groups, with the env `apps/e2e/playwright.config.ts` gives them: self-signup on, the HIBP breach check off, and a throwaway `BETTER_AUTH_SECRET` (also given to `worktree:setup`'s seed) unless one is already in the environment;
   - waits until `<web>/api/health` answers `{"status":"ok","database":"up"}` through the web proxy, then prints the URLs.

No `.env` is needed: like CI, everything the instance needs is passed as process env, and `apps/e2e/env.ts` falls back to the compose defaults. Ready output looks like:

```
verify: ready
  web       http://localhost:5283   (open this one; it proxies /api to the API)
  api       http://localhost:3110
  database  postgresql://bluprint:bluprint@localhost:5432/bluprint_wt_<slug>_e2e
  logs      <tmp>/bluprint-verify/<slug>/instance
  evidence  <tmp>/bluprint-verify/<slug>/evidence
```

Ports and database come from `.env.local` (slot n: API `3100+10n`, web `5273+10n`, `bluprint_wt_<slug>_e2e`); the main checkout uses 3100, 5273 and `bluprint_e2e`. `<tmp>` is the OS temp dir (`$TMPDIR` on macOS).

## Doctor

`bun .claude/skills/verify/scripts/instance.ts doctor` is read-only and exits non-zero on any `FAIL`. Run it before driving and whenever anything looks off. It checks that both process groups are alive, that each port is held by our process group and not something else, that `/api/health` answers ok through the web proxy, that the seeded admin exists in the instance database, and that the checkout has not changed since `up` (a `FAIL build` line means the instance serves stale code: `down`, then `up`).

## Drive

A journey is a `.ts` file whose default export receives `{ page, context, shot, note, expect, query, device, accounts, baseURL }`:

- `page`, `context`: Playwright, with `baseURL` set, so `page.goto("/projects")` works.
- `shot(name)`: full-page screenshot into the evidence dir, numbered in order.
- `note(line)`: appends a line to the device log.
- `expect`: Playwright's `expect`, web-first assertions included.
- `query(sql, params)`: rows from the instance database, on a read-only connection, for proving side effects.
- `accounts`: `ADMIN_EMAIL` (Ana, org admin), `MANAGER_EMAIL`/`MANAGER_NAME` (Carla, manager), `SEED_PASSWORD`, from `apps/e2e/seed-account.ts`.

`--as admin` (default) or `--as manager` signs in through the real `/login` screen before the journey; `--as none` starts signed out. `--device phone` is WebKit as an iPhone 13 (390×664, the user's real device class), `--device desktop` is Chromium at 1280×720; the default `both` runs phone then desktop, each in a fresh browser.

Write throwaway journeys outside the repo (the evidence dir or the scratchpad) and import nothing: everything comes from the argument. Select by role and accessible name (`getByRole("button", { name: "Entrar" })`, `getByLabel("E-mail")`), the same handles `apps/e2e/tests/` uses; interface text is pt-BR. Wait on a web-first `expect`, never a fixed sleep. A shipped example that proves `auth-login`:

```bash
bun .claude/skills/verify/scripts/drive.ts .claude/skills/verify/journeys/login.ts --as none
```

The API alone can be exercised with `curl` against `<web>/api/...` (the path a browser takes); every route except `/api/health` needs the session cookie, so prove authenticated behaviour through a journey instead.

## Evidence

Each run writes to `--out <dir>` or, by default, `<tmp>/bluprint-verify/<slug>/evidence/<timestamp>-<journey>/`, printed at the end:

- `<device>-NN-<name>.png`: each `shot`, in order.
- `<device>-video/*.webm`: the whole session, action by action.
- `<device>-trace.zip`: Playwright trace with DOM snapshots; open with `bunx playwright show-trace <file>` from `apps/e2e`.
- `<device>.log`: steps, console errors and warnings, page errors and every HTTP response ≥ 400.

Proof standards:

- Drive the real user path: the screens, buttons and routes a user touches. Never a test-only endpoint, an internal setter or a direct database write.
- Capture the action and the resulting state (a `shot` before and after), not only the final screen.
- Prove side effects alongside what is visible: a row inserted (`query`), a session cookie set, `/api/auth/get-session` returning the user.
- Cover both devices for any interface change; the phone is the primary one.
- Open the screenshots and look at them. A login screen, a spinner or an error toast where the change should be is a failure, whatever the exit code says.
- An empty `<device>.log` apart from step lines is part of the proof; read any error in it.
- When the seed lacks a precondition a journey needs, build it through the UI, or report the journey failed and why. Never weaken the journey to make it pass.

## Cleanup

`bun .claude/skills/verify/scripts/instance.ts down` sends SIGTERM to the two process groups `up` recorded (SIGKILL after 10 s) and deletes the instance dir with its logs. It never kills by process name or port, and leaves Postgres, the databases (the next `up` reseeds them) and every evidence dir alone. Run it after every session, including a failed `up`.

## Gotchas

- `bun run e2e` in the same checkout uses the same ports and database: run it before `up` or after `down`, never while an instance is up. `up` refuses a busy port and names its pid; stop only an instance you started.
- `up` rebuilds every time; after editing code, `down` then `up`. `doctor` flags a stale instance.
- `worktree:setup` runs `bun install`, whose `prepare` (`scripts/install-hooks.sh`) skips `lefthook install` when git's hooks dir is read-only, so setup proceeds without installing hooks. Never disable lefthook or change `core.hooksPath` to get past a hook (ADR 0048).
- Cookies are not port-scoped: a browser shared across two instances mixes their sessions. `drive.ts` gives every run a fresh browser context.
- Sign-in and sign-up allow 5 attempts per minute per client IP (`apps/api/src/auth/auth.ts`), failed ones included, and every `--as admin|manager` run spends one per device. Past it, `/login` shows `Muitas tentativas seguidas. Aguarde um minuto e tente de novo.`: wait the minute out rather than retrying in a loop.
- A secret generated by `up` lives only as long as the instance; sessions from an earlier `up` are not valid afterwards.
