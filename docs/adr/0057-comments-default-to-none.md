# Comments default to none

`.claude/rules/code-comments.md` described what a good comment says, and `comment-nudge.ts` asked, after every edit, whether each new comment passed that test ([0048](0048-hooks-enforce-agent-guardrails.md)). Agents still commented heavily: across #119–#122, about 72 new comments, half of them JSDoc on React components and props that restated the name, and 14 in test files narrating the seed. Almost any comment can be argued into "it says why", and the author judging its own comment keeps it. Rationale that matters already lives in an ADR or a commit body, so a comment that re-explains it adds reading time, not information.

The default flips: **no comment**, and the burden of proof is on the comment. What the rule allows narrows to what a competent reader would get wrong without it — a hazard, a unit, a workaround — in one line. Three layers carry it:

- **The rule** (`.claude/rules/code-comments.md`) opens with the default, says rename before commenting, and shows cut and kept comments taken from this codebase.
- **A hard gate for the structural cases.** `comment-guard.ts`, which replaces `comment-nudge.ts`, runs on `PreToolUse` for `Edit|Write` and denies an edit that adds a comment to a test file (`*.test.*`, `*.spec.*`, `*.int-spec.*`, `apps/e2e/`) or JSDoc to a component (a PascalCase function that renders JSX), a `*Props` type or a component's prop in a `.tsx` file. These need no judgment, so the author can't argue past them.
- **An independent reviewer for the rest.** `comment-review.ts` runs on `Stop`. It diffs the branch against its merge-base with `main`, including uncommitted and untracked files, so a comment written through `Bash` or committed mid-turn is caught too. Banned comments block without a model call. Every other new comment goes to `claude -p --model sonnet` in a fresh context, with the rule and a few lines around each comment. A rejected comment blocks the stop with the reviewer's reason, and the turn continues until it's gone. Verdicts are cached in the git dir, keyed by file and comment text, so a turn that adds no comments costs no model call, and a comment is judged once. The `PostToolUse` nudge is gone: it asked the author again. `/code-review`'s standards pass still reads the rule before a merge.

## Consequences

- **Some good comments are lost with the bans.** A hazard in a test (why one assertion rides along in another test) has to become the test's name or its own test; a prop's unit or nullability has to live in its name or its type. Accepted: the bans remove far more noise than signal.
- **The gate binds agents only.** A human's editor never runs Claude Code hooks, and nothing in lint or CI enforces the bans.
- **Lint and TypeScript directives are exempt** (`biome-ignore`, `eslint-disable`, `@ts-expect-error`, `/// <reference>`), and so is every comment an edit keeps from the file's prior contents: the hook compares with the file on disk, `HEAD` and the index, so an existing comment never blocks an unrelated edit.
- **Fails open.** A worktree without `node_modules` has no TypeScript parser, and a reviewer that fails or times out (170 s) returns no verdict. Either way the hooks let the edit or the stop through, like every hook in [0048](0048-hooks-enforce-agent-guardrails.md) on an unexpected error; an unjudged comment is judged at the next stop.
- **A Sonnet call per turn that adds comments**, about 20 s at the stop. The reviewer runs with `--setting-sources user`, so this project's hooks don't recurse into it, and with read-only tools.
- **A reworded rejected comment is a new comment** and goes back to the reviewer; the block message tells the author not to.
- **Existing comments stay** until someone changes the code they sit on; the rule governs only code being written or changed.

## Considered Options

- **Keep the rule and sharpen its wording**: cheapest, but the author still decides what clears the bar, and that is what failed.
- **Block every new comment, allow-listed by a marker**: a marker the author adds itself is the same judgment with more ceremony.
- **A `PostToolUse` nudge that hands the new comments back to the author** (the first version of this ADR): the author re-judges its own comment and keeps it.
- **A `type: "agent"` or `type: "prompt"` Stop hook**: a model call on every stop, even with no new comments, and an agent hook only gets Read, Grep and Glob, so it can't run `git diff` to find them. Agent hooks are also marked experimental.
- **`/code-review` alone**: it runs when someone remembers to, after the turn that wrote the comment has ended.
