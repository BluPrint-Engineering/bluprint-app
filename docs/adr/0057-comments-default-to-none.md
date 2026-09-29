# Comments default to none

`.claude/rules/code-comments.md` described what a good comment says, and `comment-nudge.ts` asked, after every edit, whether each new comment passed that test ([0048](0048-hooks-enforce-agent-guardrails.md)). Agents still commented heavily: across #119–#122, about 72 new comments, half of them JSDoc on React components and props that restated the name, and 14 in test files narrating the seed. Almost any comment can be argued into "it says why", and the author judging its own comment keeps it. Rationale that matters already lives in an ADR or a commit body, so a comment that re-explains it adds reading time, not information.

The default flips: **no comment**, and the burden of proof is on the comment. What the rule allows narrows to what a competent reader would get wrong without it — a hazard, a unit, a workaround — in one line. Three layers carry it:

- **The rule** (`.claude/rules/code-comments.md`) opens with the default, says rename before commenting, and shows cut and kept comments taken from this codebase.
- **A hard gate for the structural cases.** `comment-guard.ts`, which replaces `comment-nudge.ts`, runs on `PreToolUse` for `Edit|Write` and denies an edit that adds a comment to a test file (`*.test.*`, `*.spec.*`, `*.int-spec.*`, `apps/e2e/`) or JSDoc to a component, a `*Props` type or a prop in a `.tsx` file. These need no judgment, so the author can't argue past them. On `PostToolUse` it still hands back the other comments an edit added, against the new default.
- **An independent reviewer for the rest.** `/code-review`'s standards pass reads the rule and has no comment of its own to defend.

## Consequences

- **Some good comments are lost with the bans.** A hazard in a test (why one assertion rides along in another test) has to become the test's name or its own test; a prop's unit or nullability has to live in its name or its type. Accepted: the bans remove far more noise than signal.
- **The gate binds agents only.** A human's editor never runs Claude Code hooks, and nothing in lint or CI enforces the bans.
- **Lint and TypeScript directives are exempt** (`biome-ignore`, `eslint-disable`, `@ts-expect-error`, `/// <reference>`), and so is every comment an edit keeps from the file's prior contents: the hook compares with the file on disk, `HEAD` and the index, so an existing comment never blocks an unrelated edit.
- **Fails open.** A worktree without `node_modules` has no TypeScript parser for the hook, which then lets the edit through, like every hook in [0048](0048-hooks-enforce-agent-guardrails.md) on an unexpected error.
- **Existing comments stay** until someone changes the code they sit on; the rule governs only code being written or changed.

## Considered Options

- **Keep the rule and sharpen its wording**: cheapest, but the author still decides what clears the bar, and that is what failed.
- **Block every new comment, allow-listed by a marker**: a marker the author adds itself is the same judgment with more ceremony.
- **A Stop-hook agent that reviews every turn's comments** ([0048](0048-hooks-enforce-agent-guardrails.md) deferred it): a model call per stop, and `/code-review` already runs before anything is committed.
