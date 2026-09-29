---
paths:
  - "apps/web/**"
---

# `apps/web` conventions

- **`routeTree.gen.ts` is generated — regenerate it, don't hand-edit.** It comes from the TanStack Router plugin; CI fails if the committed file is stale (`git diff --exit-code` after a fresh build).
- **`components/ui/` is shadcn output, but not read-only.** Add a component with `bunx shadcn add <name>`, then edit it to match the design system's tokens (`apps/web/src/styles/globals.css`) — sizes, radii and colors are expected to change. To pull an upstream update later, use `bunx shadcn diff <name>` and merge by hand; never `--overwrite`, it discards those edits.
- **An API failure is an `ApiError`; branch and translate on `error.problem?.code`**, never on `message` or `detail`, which are English developer text ([0047](../../docs/adr/0047-errors-are-rfc-9457-problem-details.md)).
- **`features/<x>/<Page>/` → `features/<x>/components/` → `components/`.** A file lives in its page's folder until a **second** page needs it, and in its feature until a **second** feature does — only then does it climb a level.
- **A route is a folder**: `routes/<segment>/route.tsx` beside `route.test.tsx`, never `routes/<segment>.tsx`; `index.tsx` is only an index route.
- **Four constraints apply to any UI work**, checked on every PR: interface text in pt-BR; large touch targets reachable one-handed; status and discipline never signalled by colour alone (a label, icon or legend alongside); colours legible over a light floor plan in direct sun.

## An interface change carries its captures

The reviewer judges the change from the PR body alone, a mobile and a desktop screenshot of every **changed state** ([0058](../../docs/adr/0058-pr-captures-from-the-playwright-mcp.md)). Before `gh pr create`:

1. **List the changed states** from `git diff main...HEAD -- apps/web`, each a route plus a state: `/projects` page 1, `/projects` empty, `/login` wrong password. A changed interaction is a flow, captured as one state per step, in order. Done when every changed page, component and route maps to a state, or is named as having no visible effect.
2. **Capture each state with the Playwright MCP** against `bun run dev`, signed in as Ana from `apps/api/src/db/seed/fixture.ts`: `browser_resize` to 390×664, then 1280×720 (the E2E iPhone 13 and Desktop Chrome viewports), and `browser_take_screenshot` with `fullPage` and `filename: ".playwright-mcp/<state>-mobile.png"` / `-desktop.png`. The MCP writes only inside the repo; `.playwright-mcp/` is git-ignored. A state the dev database lacks is built through the UI. Done when every state has both images and you have opened each one and seen the change in it, not a login screen, a spinner or an error.
3. **Put the images in the body**, under the Web block's boxes, one table row per state, alt text in pt-BR naming it. Each path is absolute and the identical string later passed to `--attach`:

   ```markdown
   | Celular | Desktop |
   | --- | --- |
   | ![Obras, página 1 — celular](/abs/repo/.playwright-mcp/projects-p1-mobile.png) | ![Obras, página 1 — desktop](/abs/repo/.playwright-mcp/projects-p1-desktop.png) |
   ```

4. **Open the PR** with one `--attach <abs path>` per image, 50 per command at most: `gh pr create --body-file <body.md> --attach …`. gh (≥ 2.101) uploads each file and rewrites its path into a GitHub URL. When some uploads fail, gh still creates the PR and exits non-zero; attach the rest with `gh pr edit <n> --attach <path>`.
5. **Verify and clean up.** Done when `gh pr view <n> --json body -q .body` shows every image as a `https://github.com/user-attachments/…` URL and no local path, `.playwright-mcp/` is deleted, the MCP browser is closed, and the dev server you started is stopped.
