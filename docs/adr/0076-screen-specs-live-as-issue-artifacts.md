# Screen specs live as issue artifacts

A parent GitHub issue per screen holds its full visual spec, handoff, static key-state HTML and self-contained interactive prototypes. Each implementation ticket is a native sub-issue whose artifacts contain only its slice. Screen sources and generated output stay outside the repository; `.claude/skills/bluprint-design/` remains the design system and owns `screen-artifacts.ts`. This removes checked-in screen bundles while keeping designs beside their implementation work.

The [personal-repository spike](https://github.com/lucamandelli/bluprint-artifact-spike/issues/1) confirmed HTML uploads through 4.70 MB, closed-issue artifacts, independent sub-issue artifacts and byte-identical downloads. **Scripts did not run in default preview as of 2026-10-29**, including inline/CDN probes and a fully bundled prototype. A script-free React DOM snapshot rendered correctly in a signed-in preview. This is an observed default, not a permanent platform guarantee; GitHub documents a restricted sandbox and the panel has settings. We publish both static preview snapshots and interactive files for download-and-open-locally. See [spike evidence](../agents/screen-artifact-spike.md).

The builder embeds the app's installed Geist fonts, pinned and integrity-checked React/ReactDOM/Babel, CSS imports, the design system and sibling components. Library scripts and primary prototype logic are encoded to preserve their bytes; authored templates and props stay readable: the spike's direct-source round-trip rewrote some literal JavaScript Unicode escapes. Before any upload the publisher rejects literal Unicode escapes and control characters in every body. QA export waits for every state, forces offscreen rendering, then captures React's rendered DOM and CSS rules without scripts. Static groups have state anchors and retain mobile/desktop and light/dark frames; desktop frames scroll within the narrow preview. Cross-screen demo navigation is frozen; issue links carry navigation between specs.

Artifacts need network access and `gh` >= 2.103, and edits are immediate, versioned issue writes rather than PR-reviewed source diffs. An implementation PR cites the exact artifact URLs and versions it implements. Product requirements, architecture and decisions still change in their repository docs in that PR; an artifact edit alone cannot override them. Download to work offline or compare versions; avoid deletion, which loses artifact history. The skill publisher verifies every download before a screen is removed from git.

## Migrated screens

| Screen | Parent issue |
| --- | --- |
| Autenticação | [208](https://github.com/BluPrint-Engineering/bluprint-app/issues/208) |
| Estrutura | [6](https://github.com/BluPrint-Engineering/bluprint-app/issues/6) |
| Obra | [46](https://github.com/BluPrint-Engineering/bluprint-app/issues/46) |
| Obras | [94](https://github.com/BluPrint-Engineering/bluprint-app/issues/94) |
| Unidades | [167](https://github.com/BluPrint-Engineering/bluprint-app/issues/167) |

Existing historical ticket relationships stay intact; new tickets follow the slice rule. Historical issue bodies may still name retired paths: read their screen parent's artifacts. The last repository copy of `docs/design/screens/` is at `4773f22a8e61801969622f7f8e74607e22cd4b63`. Agent commands and label/board conventions live in [issue-tracker.md](../agents/issue-tracker.md).

Keeping screen bundles in git would preserve atomic PR review and offline access, but duplicates runtime assets and leaves visual references separate from implementation tickets. External prototype hosting adds a second publishing surface. Issue artifacts keep the references together; static previews handle the observed sandbox restriction without requiring another host.
