# PR captures come from the Playwright MCP

Supersedes [0055](0055-pr-screenshots-in-the-body.md).

An interface change is still reviewed from the images in its PR body, a mobile and a desktop screenshot of every state it changes, uploaded with `gh --attach`. What changes is where the images come from: the agent that built the change captures each changed state with the Playwright MCP against `bun run dev`, then opens the PR. The steps live in `.claude/rules/web.md`, which loads whenever an agent touches `apps/web`, so every interface change carries its captures without anyone invoking `/open-frontend-pr`; that skill is deleted.

0055 took the images from the E2E run and recorded a flow no test reached from a git-ignored `*.local.spec.ts`. In practice agents wrote a spec to reach a state rather than open the app, and a test's `test-finished` screenshot shows where the test ends, often not the state the change touched. The E2E suite stays what [0050](0050-playwright-for-end-to-end.md) made it: the user flows CI walks through, not a capture tool.

## Consequences

- **A changed interaction is a sequence of screenshots**, one per step, in order. The Playwright MCP records no video, so the PR body carries none.
- **The MCP writes only inside the repo**: captures go to `.playwright-mcp/`, git-ignored and deleted once the PR body shows the uploaded URLs.
- **Mobile is a 390×664 viewport**, the E2E iPhone 13 size, not full device emulation: no touch events and a device pixel ratio of 1. Enough to judge layout, which is what the review reads.
- **A state the dev database lacks is built through the UI** before it is captured.

## Considered Options

- **Keep 0055, E2E first**: a whole suite run per PR, screenshots of the wrong state, and specs written only to take a picture.
- **`*.local.spec.ts` only for video**: keeps motion in the review, but still has the agent writing test code to produce a PR image.
- **Launch the MCP with `--device "iPhone 13"`**: true emulation, but one device per MCP server, so desktop would need a second server.
