---
name: import-design
description: Import a Claude Design export zip into the repo and open the PR. Use when the user has downloaded a Claude Design zip, either the design system or a screen handoff.
---

A Claude Design export is a zip of one of two kinds, and `import.ts` tells them apart by content:

- **design system**: replaces the contents of `.claude/skills/bluprint-design/`.
- **screens** (a `design_handoff_<screen>/` folder): each screen goes to `docs/design/screens/<screen>/`, replacing that folder; the export's `_ds/` copy of the design system is dropped, and the prototypes are pointed at the skill instead. The script refuses the import when the handoff's design system differs from the repo's: the design-system export goes in first.

## Steps

1. From an up-to-date `main`, create the branch: `docs/design-system-sync`, or `docs/<issue>-<screen>-design-handoff` for screens.
2. Run `bun .claude/skills/import-design/import.ts [zip]`. With no argument it takes the newest `.zip` in `~/Downloads`; confirm that file name with the user when it doesn't name a Claude Design export. Done when it prints `kind:`.
3. Follow the branch for that kind (below). Done when `git status` shows only the intended changes.
4. Commit `docs: …`, with a body that says why. Open the PR with the body built from `.github/pull_request_template.md`, blocks that don't apply marked `n/a` and kept; for screens, `Refs #<issue>`.

### Design system

- For each path printed under `removed:`, search the repo outside the skill for references to it (`docs/`, `apps/`, issue bodies you are working from) and fix them or list them in the PR.
- The screen prototypes load `_ds_bundle.js` and `styles.css` from the skill root: if either was removed or renamed, stop and tell the user every prototype in `docs/design/screens/` breaks.

### Screens

- In the spec (`spec:` line), rewrite what the export says about its own layout, and only that: `_ds/…` becomes `.claude/skills/bluprint-design/…`, "serve this folder" becomes "serve the repo root" with the path `docs/design/screens/<screen>/…`, and the `_ds/` row of the files table goes. Everything else is the designer's text and stays as written.
- Check the spec's claims about the repo today (what the API serves, where files land, what the session carries) against the code. List every mismatch in the PR description, for the implementation refinement to settle.
- Open the prototype: `bunx serve -l <free port> .` from the repo root, then `docs/design/screens/<screen>/<Screen>.dc.html` in the browser. It renders with no console error except a missing favicon; stop the server afterwards.
