---
name: open-frontend-pr
description: Open the PR for an interface change, with mobile and desktop screenshots of every changed state, and a video of every changed flow, uploaded into the body.
disable-model-invocation: true
---

A reviewer judges an interface change from the images in the PR body, without checking out the branch. The images go up with `gh`'s own `--attach` (gh ≥ 2.101, on `gh pr create`, `gh pr edit` and `gh pr comment`): no manual upload, no image committed to the repo.

## Steps

1. **List the changed states.** From `git diff main...HEAD -- apps/web`, write down every screen state the change alters: route plus state (`/projects` page 1, `/projects` empty, `/login` wrong password…). Done when every changed page, component and route in the diff maps to at least one state, or is named as having no visible effect.
2. **Capture each state, mobile and desktop.** `docker compose up -d --wait`, then `bun run e2e` (as `E2E_VIDEO=1 bun run e2e` when step 3 applies, so one run serves both): every test leaves a full-page `test-finished-1.png` in `apps/e2e/test-results/`, one folder per test and project; long names are cut to a hash in the middle (`projects-project-list-open-551cc-…-iPhone-13`), so find a test's folders by the spec prefix and the `iPhone-13` / `Desktop-Chrome` suffix. For a state no test reaches, run `bun run dev` and capture it with the Playwright MCP at 390×664 and 1280×720 (the E2E projects' viewports), signed in as `ana@horizonte.test` / `canteiro-de-obras-azul` (the seed admin). Copy each image into the scratchpad with a short name, `<state>-mobile.png` / `<state>-desktop.png`: the next E2E run wipes `test-results/`. Done when every state has both images and you have opened each one and seen the change in it, not a login screen, a spinner or an error.
3. **Interaction change: record the flow.** When the PR changes how something responds (a gesture, a dialog, pagination, a transition), the `E2E_VIDEO=1` run leaves a `video.webm` beside each test's screenshot. For a flow no test walks through, write it in `apps/e2e/tests/<flow>.local.spec.ts` (gitignored, deleted in step 7) and run the suite again. Copy the video of each changed flow into the scratchpad as `<flow>-mobile.webm` / `<flow>-desktop.webm`; it goes up with `--attach` like an image and renders as a player, so it fills the template's video box. No interaction change: that box stays unticked with `n/a` and why.
4. **Write the body** from `.github/pull_request_template.md` into a scratchpad file, blocks that don't apply marked `n/a` and kept. In the Web block, tick only what you checked, with a note on how, then put the images under the boxes as a table, one row per state:

   ```markdown
   | Celular | Desktop |
   | --- | --- |
   | ![Obras, página 1 — celular](/abs/scratch/projects-p1-mobile.png) | ![Obras, página 1 — desktop](/abs/scratch/projects-p1-desktop.png) |
   ```

   Alt text in pt-BR, naming the state. A video goes on its own line below the table as `![](<abs>/<flow>-mobile.webm)`: empty alt, since a video takes none, but still the image syntax, or gh leaves the path in place and appends the video at the end of the body. Each path is written exactly as it will be passed to `--attach`: absolute, identical string.
5. **Open the PR**, pushed branch, Conventional Commits title:

   ```bash
   gh pr create --title "feat(web): …" --body-file <body.md> \
     --attach <abs>/projects-p1-mobile.png --attach <abs>/projects-p1-desktop.png
   ```

   One `--attach` per image, 50 at most per command. If some uploads fail, gh still creates the PR, prints its URL and exits non-zero: attach the missing ones with `gh pr edit <n> --attach <path>` rather than creating it again.
6. **Verify the upload.** `gh pr view <n> --json body -q .body`. Done when every image and video is a `https://github.com/user-attachments/…` URL, no local path is left in the body, and each state still has its mobile and desktop image.
7. **Clean up** what the capture left behind: stop the `bun run dev` you started, close the Playwright MCP browser, and delete `apps/e2e/test-results/`, `apps/e2e/playwright-report/`, `apps/e2e/playwright/.auth/` (a live session cookie), any `.playwright-mcp/` folder the MCP wrote, any `apps/e2e/tests/*.local.spec.ts`, and the images, videos and body file in the scratchpad. Done when `git status --ignored --short` shows none of them and no server you started is still listening; servers the user already had running stay up. Hand the user the PR URL.
