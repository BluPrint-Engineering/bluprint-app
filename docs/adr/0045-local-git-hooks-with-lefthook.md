# Local git hooks with Lefthook

CI (`.github/workflows/ci.yml`, [0018](0018-ci-runs-root-scripts.md)) is the only place a forgotten `bun run lint` or a broken test is caught, and that is minutes after the push. Lefthook adds three local hooks that catch the common cases before that round trip, without becoming a second source of truth for what "passing" means: they run the same root scripts CI runs, just narrowed to what's fast enough to sit in front of a commit or a push.

Lefthook over Husky + lint-staged: one Go binary (`bunx lefthook`, no shell wrapper scripts to maintain), native `{staged_files}` templating and `stage_fixed` re-staging, and jobs can run in parallel or piped in the same YAML file. It installs into the git common dir (`git rev-parse --git-common-dir`), so every worktree shares the same hooks from one `lefthook.yml`.

## What runs where

- **`pre-commit`** (parallel): Biome (`--write`, staged files, everything but `apps/api`) and, only when an `apps/api` file is staged, the API's ESLint + Prettier pipeline (`apps/shared` is rebuilt first — the same reason CI rebuilds it before linting, [0018](0018-ci-runs-root-scripts.md)). Both stage their fixes back (`stage_fixed: true`), so a commit that only needed formatting still succeeds. Scoped to staged files, not the whole repo: `bun run lint` on a monorepo this size is too slow for every commit.
- **`pre-push`**: a branch-name check first ([0048](0048-hooks-enforce-agent-guardrails.md)), then `bun run typecheck`, `bun run test:unit` (API, no database), and the web Vitest suite. No integration tests here — `*.int-spec.ts` needs Postgres up ([0007](0007-jest-for-api-vitest-for-web.md)), and a push hook can't assume `docker compose up -d --wait` has been run.
- **`commit-msg`**: a regex against the Conventional Commits types already in use (`docs/ARCHITECTURE.md` §8) — `type(scope): subject`, plus `Merge`/`Revert`/`fixup!` etc. No new dependency; a shell one-liner is enough for a fixed type list. The branch-name check reuses the same type list through a YAML-anchored `COMMIT_TYPES` env var, so the two regexes can't drift apart.

## Consequences

- **Hooks are advisory, CI is the gate.** `--no-verify` or `LEFTHOOK=0 git commit` skips them outright; CI still runs the full suite unscoped. Nothing here replaces a required check. An agent can no longer reach for either bypass: `guard-bash.ts` blocks both ([0048](0048-hooks-enforce-agent-guardrails.md)). A human still can.
- **`bun install` wires the hooks** via a root `"prepare": "lefthook install"` script — no separate setup step, and harmless to re-run in CI (nothing calls `git commit` there).
- **Integration tests, `lint:fix`'s Prettier-in-API pass, and `build` stay out of both hooks.** They're either too slow for a commit/push cadence or need infrastructure (Postgres) a hook shouldn't assume is running.
- **A new commit type means editing `lefthook.yml`'s `COMMIT_TYPES`**, same file, same review, as adding it to `docs/ARCHITECTURE.md` §8.
