---
name: bluprint-design
description: Use this skill to design or build BluPrint interfaces, for production or for prototypes. Contains the design rules, color and type tokens, fonts, brand assets and the component primitives.
user-invocable: true
---

Read the readme.md file within this skill, and explore the other available files. HANDOFF.md explains how each piece maps to `apps/web`.
This skill holds the design system. Screen designs live in `docs/design/screens/<screen>/` and load the system from here.
If creating visual artifacts (mocks, prototypes), copy assets out and create static HTML files for the user to view. If working on production code, rebuild the primitives with shadcn and follow the rules here.
If the user invokes this skill without other guidance, ask what they want to build and act as an expert designer who outputs HTML artifacts or production code, depending on the need.

## Designing a screen

A screen is written straight into `docs/design/screens/<screen>/`: a `README.md` spec (pt-BR) and the `*.dc.html` prototypes, loading `styles.css` and `_ds_bundle.js` from this skill. A primitive, variant or glyph the screen needs is added here first, never drawn inside the screen.

After any change to `components/**/*.jsx`, rebuild the bundle with `bun .claude/skills/bluprint-design/build-bundle.ts` (`--check` only compares). Module-level code must not touch React: the prototypes load the bundle before React, and the build fails when a module does.

Before the PR:

1. Open each changed prototype (`bunx serve -l <free port> .` from the repo root, then `docs/design/screens/<screen>/<Screen>.dc.html`). It renders with no console error and an empty `window.BluPrintDesignSystem_d4fa62.__errors`; a missing favicon is the only accepted console line.
2. Check every claim the spec makes about the repo today (what the API serves, where files land, what the session carries) against the code. List each mismatch in the PR description, for the implementation refinement to settle.
