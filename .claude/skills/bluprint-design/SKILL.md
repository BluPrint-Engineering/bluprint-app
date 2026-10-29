---
name: bluprint-design
description: Use this skill to design or build BluPrint interfaces, for production or for prototypes. Contains the design rules, color and type tokens, fonts, brand assets and the component primitives.
user-invocable: true
---

Read `readme.md` for the design rules and `HANDOFF.md` for the mapping to `apps/web`. This skill holds the design system; screen specs live on GitHub issue artifacts (ADR 0076). Production primitives are rebuilt with shadcn.

## Designing a screen

1. Read `docs/agents/issue-tracker.md`. Use a parent issue per screen for the complete spec, handoff and prototypes. Each implementation ticket is a native sub-issue with artifacts containing only its slice. Work in a scratch directory outside the repository: `README.md`, `HANDOFF.md`, `*.dc.html` and a QA prototype with frozen key states. Give each QA row `data-screen-label="{{ row.id }}"`; its state id is letters followed by a number and an optional alphanumeric suffix, such as `N3a` or `C7a2`.
2. Add missing primitives, variants and glyphs to this skill first. After changing `components/**/*.jsx`, rebuild with `bun .claude/skills/bluprint-design/build-bundle.ts`. Module-level code must not touch React: the bundle also loads before React in existing authoring tools.
3. Build a self-contained bundle with `bun .claude/skills/bluprint-design/screen-artifacts.ts build <scratch-screen-dir>`. The command prints a temporary directory. It embeds the app's installed Geist fonts, pinned React/ReactDOM/Babel, the runtime, the design system and sibling prototypes. Run only trusted, reviewed prototypes. Cross-screen demo navigation is frozen; use the spec's issue links to move between screens.
4. Run `bun .claude/skills/bluprint-design/screen-artifacts.ts snapshot <temp-bundle-dir> '<Screen> QA.dc.html'`. Requires `chrome-devtools-axi` and Chrome. It pre-renders every QA state, then exports script-free HTML grouped by state prefix. Each group has state anchors, mobile/desktop and light/dark frames; desktop frames scroll horizontally in the narrow issue panel. Open the resulting `*-static.html` files and the interactive prototypes locally. Check every state, no console errors, no placeholder frames and empty `window.BluPrintDesignSystem_d4fa62.__errors` on interactive pages.
5. Verify each spec claim about the current API, files and session against the code. List mismatches in the implementation PR. Publish with `bun .claude/skills/bluprint-design/screen-artifacts.ts publish <full-issue-url> <temp-bundle-dir>`. It rejects literal Unicode escapes/control characters before upload, creates artifacts or versions same-named artifacts, and checks each download byte-for-byte. Keep the printed artifact URLs in the issue/PR handoff. Rebuild after changing any output; the manifest rejects altered files.

Scripts did not run in GitHub's **default preview as of 2026-10-29**. Static artifacts are the preview; interactive `*.dc.html` artifacts are source plus download-and-open-locally references. Download with plain `gh issue artifact download`; commands and version selection are in `docs/agents/issue-tracker.md`. Keep all screen sources, generated bundles and captures outside the repository. Only design-system changes and decisions belong in the PR.
