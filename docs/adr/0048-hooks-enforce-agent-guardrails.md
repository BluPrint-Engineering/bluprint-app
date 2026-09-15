# Hooks enforce agent guardrails

Several rules used to live only in `CLAUDE.md`, memory or an agent's own judgment: don't merge a PR, don't push or force-push `main`, don't skip Lefthook, don't run a destructive `drizzle-kit` command, don't read or write `.env`. That was enough for one agent watched step by step; it isn't enough for several agents running unattended in parallel worktrees. Claude Code hooks make the deterministic subset of those rules mechanical instead of advisory, so an agent can be trusted to work and commit without a human checking every command.

Three Bun TypeScript hooks in `.claude/hooks/`, registered in a committed `.claude/settings.json`:

- `guard-bash.ts` (`PreToolUse`, `Bash`): blocks `gh pr merge`, `git push` to `main`, `--force`/`-f` (`--force-with-lease` stays allowed off `main`), `--no-verify`, `LEFTHOOK=0`, `drizzle-kit push`/`drop`, and shell reads or writes of `.env`.
- `guard-env.ts` (`PreToolUse`, `Read|Edit|Write|Grep|Glob`): blocks any path whose basename is `.env`.
- `comment-nudge.ts` (`PostToolUse`, `Edit|Write` on `.ts`/`.tsx`): never blocks; hands back the comments an edit just added, against the tightened `.claude/rules/code-comments.md`.

`.claude/settings.json` is committed, not personal: every agent gets it regardless of `settings.local.json`. `jsdoc/informative-docs` (`eslint-plugin-jsdoc`) backs the same comment rule for the API with a real lint failure, since Biome has no JSDoc-content rule for the web app.

A fourth guardrail lives in Lefthook, not a Claude Code hook: `pre-push` rejects a branch name outside `<type>/[<issue>-]<slug>` ([0045](0045-local-git-hooks-with-lefthook.md)). It belongs there rather than in `guard-bash.ts` because the rule is about repo state (the current branch), not a specific command, and a human can create a branch outside Claude Code too — `git worktree add` and Orca's own worktree tooling both name branches after the worktree (`worktree-*`) or the OS user (`user/...`), neither of which fits the convention.

## Consequences

- **Rules-only, not judgment.** The hooks parse the command or the path; they don't know intent. A determined rewrite of a blocked command (a typo'd flag, an unusual quoting) can still slip through — this is a guardrail, not a sandbox.
- **`comment-nudge.ts` never blocks.** It's a nudge against the delete test in `.claude/rules/code-comments.md`, not a gate; a human still reviews the diff before commit.
- **Bypassable only by a human.** `--no-verify` and `LEFTHOOK=0` still work outside an agent's tool calls (a human's own shell), same as [0045](0045-local-git-hooks-with-lefthook.md); CI stays the real gate.

## Considered Options

- **Leave the rules advisory** (the status quo: `CLAUDE.md`, `.claude/rules/`, memory): cheapest, but exactly what breaks down running several agents unattended in parallel worktrees — nothing stops the command before it runs.
- **A Stop-hook agent review**: an LLM re-checking every turn against policy would catch more, including non-mechanical violations, but costs a model call per stop and duplicates `/code-review`, which already runs before anything is committed. Deferred, not ruled out.
