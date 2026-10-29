# Screen artifact spike: 2026-10-29

Scratch repository retained: [lucamandelli/bluprint-artifact-spike](https://github.com/lucamandelli/bluprint-artifact-spike). [Parent issue](https://github.com/lucamandelli/bluprint-artifact-spike/issues/1), [independent sub-issue slice](https://github.com/lucamandelli/bluprint-artifact-spike/issues/2/artifacts/1).

- 150,000-byte, 300,000-byte and 1,000,000-byte HTML probes accepted; a fully embedded 4,699,371-byte prototype also accepted. These are observed sizes, not a maximum.
- Artifacts could be added after closing the parent issue.
- [Inline script/CSS/Function probe](https://github.com/lucamandelli/bluprint-artifact-spike/issues/1/artifacts/7) and [CDN React/Geist probe](https://github.com/lucamandelli/bluprint-artifact-spike/issues/1/artifacts/8): captain's signed-in default preview did not execute JavaScript. The external Geist sample fell back to serif. This does not establish which sandbox setting or network policy caused it.
- [Fully embedded prototype](https://github.com/lucamandelli/bluprint-artifact-spike/issues/1/artifacts/6): default preview did not hydrate; downloaded file rendered locally with no console errors, no external requests, embedded Geist and empty design-system errors. Download SHA-256 matched: `f9e1d62f9fc1f2e814c77f43a2190a90b2a03388a8fd117bc89fec8f0949a380`.
- [Script-free snapshot](https://github.com/lucamandelli/bluprint-artifact-spike/issues/1/artifacts/9): captain confirmed the signed-in preview rendered correctly. Download SHA-256 matched: `16c1fac3155d3a645506242acdaed42a4ba5d637c13c4ffcd456566b4204f452`. Local 390px and 768px viewports fit without horizontal page overflow.
- Directly embedded library source changed on download at literal Unicode escapes; base64 script encoding preserved bytes. The publisher checks every file by SHA-256.

GitHub calls this a [restricted sandbox](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/using-artifacts-with-issues), with preview settings. Record the script result as an observed default on this date, not a permanent restriction. The decision and migration index are in [ADR 0076](../adr/0076-screen-specs-live-as-issue-artifacts.md).

## Migration verification

Published 36 artifacts across the five parents indexed in ADR 0076: 10 Markdown docs, 11 interactive prototypes and 15 static galleries covering all 136 existing QA rows (536 mobile/desktop/light/dark frames). Every artifact was downloaded and matched the build manifest's SHA-256 before deleting the repository screens. After the auth theme fix, interactive QA and signup are version 3; login and both auth static galleries are version 2. Other migrated artifacts are version 1.

The primary prototype logic also needed encoding: the first signup upload rewrote two fallback Unicode escapes. The repaired download matched; its decoder restores UTF-8 before runtime boot. Preflight rejects literal Unicode escapes and C0/C1 controls across every body before any upload. Real CLI tests also rejected tampered manifests. Root lint, root typecheck (including the publisher) and a frozen Bun 1.4.0 install passed. Generated bundles, sources and captures stayed outside the repository.

Auth was rebuilt from main `4773f22a8e61801969622f7f8e74607e22cd4b63` after the login theme fix. All five affected HTML artifacts were versioned in place and hash-verified again. At 390x664, real theme-toggle clicks in both directions preserved every measured component bound for login and signup; both themes use 24px band padding.
