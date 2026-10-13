# A narrower comment keep-list, checked in review

Supersedes the source keep-list of [0057](0057-test-files-carry-no-comments.md); its rule for test files stands.

After [0057](0057-test-files-carry-no-comments.md) the source keep-list still had two open doors. "A hidden hazard" covered any surprise, so a comment could excuse a confusing function of our own instead of fixing it, and "a unit or precondition no name or type can carry" invited the claim that no type could carry it. Tool directives were kept wholesale, so an `eslint-disable` could silence a rule that catches a real bug. `comment-nudge.ts` is the only check in source, and the agent that wrote the comment is the one answering it. The `/no-comments` skill and its Comment Sicko reviewer in pstack (`cursor/plugins`) close the same doors; this adopts their criteria without the plugin.

- **A hazard is kept only when something outside forces it**: a dependency, platform, vendor or protocol we cannot reshape. A surprise in our own code is fixed with a rename, an extraction, a type or a redesign, not described.
- **A unit or precondition is a type or an assertion**, never a comment; the keep clause for it is gone.
- **A suppression is kept only for a rule that is faulty, pedantic or style-only.** Silencing a rule that catches real bugs or guards correctness or safety is removed and the code fixed.
- **A constraint comment** ("do not remove", "talk to X before changing") becomes a type, a test or a lint that enforces it.
- **Doubt deletes.** A comment that may or may not fit a keep clause goes.
- **The no-mistakes review step applies the list.** `review.path_instructions` in `.no-mistakes.yaml` hands the reviewer the keep-list for every comment a diff adds or touches, with code that only reads correctly beside its comment flagged as a refactor target, so a reviewer that did not write the code judges it and the pipeline fixes what it finds.

Workaround comments with their source, `TODO(#n)` and the test-file rule are unchanged.

## Consequences

- **A second reader without a second bill.** [0057](0057-test-files-carry-no-comments.md) turned down a reviewer agent for its model call per edit or per turn; the review step already runs once per push, so the comment criteria ride on a call that is paid anyway.
- **Honoured from `main` only.** no-mistakes reads `review.path_instructions` from the default branch's copy, so the branch that adds or changes it is not reviewed by its own version.
- **Still judgment, not a parser.** The reviewer can miss a comment or accept a weak keep; the hook and the rule remain the first line, the review the second.
- **Existing comments are not swept.** Code written under the old list changes as it is touched.

## Considered Options

- **Install pstack and run `/no-comments`**: brings a persona, its own subagents and skills (`/how`, `/why`, `/architect`) that this repo does not use, for criteria that fit in a rule and a review prompt.
- **Block every added comment in source**: still held back for the reasons in [0057](0057-test-files-carry-no-comments.md); the narrower list and the review step come first, and the hard block in source stays the next step 0057 named if comment density creeps back up.
- **Leave the rule as it was**: the hazard and precondition clauses kept excusing comments in our own code.
