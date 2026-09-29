# Test files carry no comments

`.claude/rules/code-comments.md` allowed a comment that said what the code couldn't, and `comment-nudge.ts` handed each new comment back with an open delete test ("would deleting this lose something?"). Agents answered the test in their own favour, since almost any comment can be framed as a why, and the code kept bloating. Checking every comment with a second agent would pay for the same code twice.

Agents copy the comment density of the code around them, so the fix works on the example they see, not only on the rule they read:

- **Test files carry no comments.** `.claude/hooks/comment-guard-tests.ts` runs as a `PreToolUse` hook on `Edit|Write` and refuses, with exit code 2, an edit that adds a comment to a `*.spec`/`*.test`/`*.e2e-spec` file or under `apps/e2e/`, `apps/web/src/test/` or `apps/api/test/`. Only tool directives and `TODO(#n)` pass. A test's name, its `describe` and named helpers already say what a comment would.
- **Source defaults to no comment.** The rule keeps a comment only for a hidden hazard, a unit or precondition no name or type can carry, a workaround and its source, a tool directive or `TODO(#n)`. `comment-nudge.ts` repeats that closed list instead of an open question, and still never blocks.
- **A one-time sweep** removes the existing comments the new rule doesn't allow, so the code an agent reads next is the example to follow.

`comment-nudge.ts` and `comment-guard-tests.ts` share the AST-based comment extraction in `.claude/hooks/comments.ts`: a moved or kept comment is never reported, only one the edit adds.

## Consequences

- **Tests are enforced, source is steered.** A refusal in a test costs a parse, not a model call; in source the agent still decides, with a closed list and a clean neighbourhood to decide against.
- **The bet is imitation.** If comment density in source creeps back up after the sweep, the next step is the hard block in source too.
- **Bash writes slip past the guard.** An agent writing a test through `sed` or a heredoc is not checked; `/code-review` still sees the diff.
- **A human's comment is never blocked**: hooks run only on an agent's tool calls.

## Considered Options

- **Block every added comment, source included**: deterministic everywhere, but it also throws away the hazard and workaround comments worth keeping. Held back while the imitation bet runs.
- **A reviewer agent, a `prompt` hook or a Stop hook**: catches judgment calls a parser can't, at a model call per edit or per turn, the cost this decision exists to avoid.
- **A keyword blocklist** ("returns", "sets", "loops"): the agent rewords the comment and it passes.
- **A lint rule or a Lefthook check**: would also catch Bash writes, but blocks a human's deliberate comment too, and Biome has no rule for it.
