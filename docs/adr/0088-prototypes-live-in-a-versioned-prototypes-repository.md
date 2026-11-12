# Prototypes live in a versioned prototypes repository

Amends [0076](0076-screen-specs-live-as-issue-artifacts.md).

Approved screen prototypes live in the public repository [BluPrint-Engineering/bluprint-prototypes](https://github.com/BluPrint-Engineering/bluprint-prototypes), one immutable folder per screen version (`nova-obra/v1/`). A version folder also holds the screen's `README.md` spec, its `HANDOFF.md` and the session's source files. Issues carry **link artifacts** that point at the exact file, pinned to its commit: the screen epic links its screen or gallery, and each implementation ticket links a gallery with only its states. Authoring and review sessions do not change; only publishing does. `.claude/skills/bluprint-design/screen-artifacts.ts` builds a version, commits it as one commit on the prototypes repository's `main` with no pull request, and adds the links; `SKILL.md` has the commands. A change is a new version folder, never an edit, so a link always shows what was approved, and the bluprint-app clone gains no generated files.

Each page is self-contained (React, design system, Geist and sibling screens inlined) and opens offline, from a clone or a download. GitHub Pages serves the repository as a browsing index for people, at no configuration cost beyond `.nojekyll`; issues link to the file at its commit, not to Pages. Static snapshots are retired, and with them the snapshot export and its defects.

On 2026-11-12 the Nova obra prototypes were first published as interactive HTML issue artifacts, one per QA state, and then deleted. HTML artifacts were dropped because:

- **The issue page hides the list.** Its whole Artifacts section disappeared on issues holding 24 and 40 artifacts while 13 still showed. No limit is documented. The publisher refuses to take an issue past 10 artifacts.
- **Preview depends on an undocumented policy.** Scripts ran only after rewriting each file for the sandbox observed that day (`script-src 'unsafe-inline'`, no `eval`, no storage, no fetch, no form submission) and for a transport that rewrote `\u` escapes of control characters. Issue artifacts are a public-preview feature and may change.
- **Viewing needs a GitHub login.** A logged-out browser saw only the issue page.

An implementation PR cites the link artifact and the prototype file at its commit.

## Considered Options

- **Static snapshots in Preview, interactive files downloaded** (0076): the snapshot export lost checkbox ticks, dialogs, scroll positions and select values, and crashed on a large gallery.
- **Interactive HTML artifacts on issues**: tried and dropped, for the reasons above.
- **Pages, releases or Git LFS on bluprint-app**: Pages and LFS put generated bundles in every clone; release assets are downloads, not pages.
- **A pull request per prototype version**: the content is generated from an approved session and immutable once written, so review adds a wait without a decision.
