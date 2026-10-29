# Delivering a project is final

Its license reasoning is replaced by [0074](0074-a-license-is-units-and-each-project-reserves-its-own.md); the decision stands.

Supersedes the reopening in [0056](0056-delivered-project-is-frozen-until-reopened.md) and the rename and reopen of a delivered project in [0067](0067-admin-configures-any-project-through-the-organization.md).

Delivering a project is final. A delivered project accepts no write at all, its name included, and the app offers no way to reopen it. A license is spent per project and a project is never deleted, but a project that could be reopened could also be emptied and renamed into a different site on the same license; with no way back, the license is really spent. Because the step has no way back, a manager or the admin delivers through a confirmation dialog that states what happens and asks them to tick that the project cannot be reopened before the action unlocks. A project delivered by mistake is reopened only by BluPrint support, outside the app, at the organization's request, and the reopening is logged.

Requirements: RF-215, RF-216, RF-217

## Consequences

- **No reopen route, and rename joins the refusal.** Every write route on a delivered project answers `409 PROJECT_DELIVERED` (0056), now including `PATCH /api/projects/:id` and the status itself. Reading and exporting still never depend on the status.
- **The project records who delivered it and when**, shown on its configuration ("Entregue em 14/10/2026 por Rafael Souza."): two columns on `project`, `delivered_by` and `delivered_at`.
- **Support reopens through the platform, not the app.** It changes status metadata only, so it stays within [0021](0021-platform-admin-sees-only-metadata.md); the log names who asked and who reopened.
- **A pendency found after delivery is no longer solved by reopening.** It waits for support, or a post-delivery status enters through a new RF, as 0056 already foresaw for a third status.
- **The confirmation is the design system's `AlertDialog`** (the bottom sheet below 768px); the screen is in the [Obra parent issue artifacts](https://github.com/BluPrint-Engineering/bluprint-app/issues/46) (ADR 0076).
- 0056 still governs the freeze of operational content and its error; 0067 still governs who configures.

## Considered Options

- **Reopen in the app by a manager or the admin** (0056): leaves the license loophole open, since a reopened project can be emptied and renamed into another site.
- **No way back at all**: the dialog is the only guard, and a project delivered by mistake costs a license with nothing to undo it.
- **An undo window after delivery**: one more state and rule in the app, and the loophole stays open for the length of the window.
