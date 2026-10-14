# Pre-push runs typecheck only, and no-mistakes PRs skip the Claude review

Supersedes the test jobs in the `pre-push` hook of [0045](0045-local-git-hooks-with-lefthook.md); its branch-name check ([0048](0048-hooks-enforce-agent-guardrails.md)) and the commit hooks stand.

A change was verified up to three times: `pre-push` ran typecheck, API unit tests and web Vitest (about 1.5 minutes), the no-mistakes pipeline ran its test and lint steps, and CI ran everything again. The pipeline's own push to the remote also triggers `pre-push`, so the tests ran right after the pipeline had just run them. The Claude Code Review workflow repeated the pipeline's review step and spent tokens on every push.

- **`pre-push` keeps the branch-name check and `bun run typecheck`.** The test jobs are gone; tests run in the no-mistakes test step and in CI, which stays the only clean environment and the only one with Postgres integration tests and e2e.
- **Claude Code Review skips a PR whose body carries `<!-- no-mistakes-pipeline-attestation:`.** no-mistakes writes that marker into the PR body of a run that passed its steps, and rejects a `pr.template` containing reserved markers, so a hand-written PR cannot carry it by accident. A concurrency group per PR cancels superseded runs.

## Consequences

- **A push that skips the pipeline gets no local test run.** A human pushing straight to a remote learns of a failing unit test from CI, minutes later, as before 0045 added the hook.
- **A PR that never went through no-mistakes still gets the Claude review**, once per push, with older runs cancelled.
- **The marker is a no-mistakes implementation detail.** If a later version renames it, the review runs on every PR again, which costs tokens and breaks nothing.

## Considered Options

- **Keep tests in `pre-push`**: the duplication this removes.
- **Add `lint` to `pre-push`**: pre-commit already lints staged files and the pipeline and CI run the full lint, so it would be a third run.
- **Delete the Claude Code Review workflow**: a reliable signal exists, so PRs outside the pipeline keep a review.
