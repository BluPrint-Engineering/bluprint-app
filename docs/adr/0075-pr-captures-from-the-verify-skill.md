# PR captures come from the verify skill's driver

Supersedes [0058](0058-pr-captures-from-the-playwright-mcp.md).

An interface change is still reviewed from the images in its PR body, a mobile and a desktop screenshot of every state it changes, uploaded with `gh --attach`. What changes is the tool: the agent captures each changed state with the driver of the `verify` skill (`.claude/skills/verify`), and the Playwright MCP is no longer required. The steps stay in `.claude/rules/web.md`.

0058 chose the Playwright MCP because no scripted way existed to drive the running app. The `verify` skill is that way now: it boots the production build on the E2E ports against a freshly seeded database, signs in through the real `/login`, runs at the 390×664 phone and 1280×720 desktop viewports, and is already what agents use to prove a change end to end. Capturing with a second tool duplicated it.

## Consequences

- **Captures are `shot(name)` calls in a throwaway journey** run with `drive.ts --device both --out <dir>` against an instance started with `instance.ts up`; a changed interaction is one `shot` per step, in order.
- **The skill also records video and a trace**; the PR body still carries screenshots only.
- **Captures live outside the repo**, in the `--out` directory, so nothing needs git-ignoring; the directory is deleted once the PR body shows the uploaded URLs, and the instance is stopped with `instance.ts down`.
- **Phone is WebKit as an iPhone 13**, closer to the user's device than the viewport-only resize 0058 used.
- **A state the seed lacks is built through the UI** before it is captured.

## Considered Options

- **Keep 0058, the Playwright MCP**: a second driver beside the one agents already trust, with its own repo-local output directory and cleanup.
- **E2E suite screenshots**: rejected in 0058 and unchanged; the suite stays the user flows CI walks through ([0050](0050-playwright-for-end-to-end.md)).
