# PR screenshots and videos live in the PR body

An interface change is reviewed from the images in its PR body: a mobile and a desktop screenshot of every state it changes, and a video of every flow it changes. The CI `playwright-report` artifact ([0050](0050-playwright-for-end-to-end.md)) still holds every screenshot, but reaching it means downloading and unzipping a report per PR, and it expires after 14 days, while the review needs the few states the change touches, on the page, for as long as the PR is read.

The images come from the E2E run, not from a hand capture: the suite already takes a full-page screenshot per test on both projects, and `E2E_VIDEO=1` records a video of each test. `gh` ≥ 2.101 uploads them with `--attach` and rewrites the body's local paths into GitHub attachment URLs, so no image is committed and no upload is done by hand. The `/open-frontend-pr` skill runs the whole sequence, cleanup included.

## Consequences

- **A flow no test walks through is recorded from a `*.local.spec.ts`**, git-ignored and deleted once the PR opens; it is not an E2E test the suite keeps.
- **A video is referenced as `![](<path>.webm)`** in the body: gh rewrites only image-syntax references, and appends any other attachment at the end of the body.
- **Video, not GIF**: Playwright records `.webm`, which GitHub plays inline; a GIF would need a converter the setup doesn't have, or a browser download per capture.

## Considered Options

- **The CI artifact only**: what the template asked for before; nothing to upload, but nothing to look at in the review either.
- **Screenshots committed to the branch**: visible in the diff, but every change leaves binaries in the history.
- **`claude-in-chrome`'s GIF recorder**: exports only as a browser download, drives the user's own browser session, and watermarks the frames.
