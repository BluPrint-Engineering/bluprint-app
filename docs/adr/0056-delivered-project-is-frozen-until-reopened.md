# A delivered project is frozen until it is reopened

A project is `active` or `delivered` (`project.status`, RF-215). A delivered project keeps its content exactly as it was handed over: every write route on its operational content refuses it, until an admin or a manager reopens the project (RF-216). Reading and exporting a report never depend on the status, so a delivered project still opens, lists and exports for the client or the contractor after the handover.

Requirements: RF-215, RF-216

## Consequences

- **Every write route on pins, photos, plans and structure** (locations, units, rooms, disciplines) refuses a delivered project, and says so in its acceptance criteria. The refusal is `409 PROJECT_DELIVERED` problem details ([0047](0047-errors-are-rfc-9457-problem-details.md)). None of those routes exists yet; the ticket that adds each one carries the check and the test that proves it.
- **Status and name are project metadata, not operational content.** Marking a project delivered or reopening it is allowed to a manager and an admin without conflicting with [0024](0024-admin-is-read-and-export-only.md); an assistant may not. Those routes belong to the project screen, and they are the only writes a delivered project accepts.
- **Last activity does not move** when the status or the name changes, only when operational content does, so delivering a project does not make it look freshly worked on.
- **The list shows delivered projects, quieter, and hides them by default.** `GET /api/projects` answers `status=active` unless asked otherwise, and `counts` reports both statuses whatever the filter, so a person whose projects are all delivered sees "Nenhuma obra em andamento" with a way to reach them instead of an empty list.
- Migration `0005` adds the `project_status` enum and the column with default `active`, so every existing project stays in progress.
- A third status (on hold, cancelled, post-delivery support) enters through a new RF and one more enum value; until then a pendency found after delivery is solved by reopening the project.

## Considered Options

- **A boolean `delivered`**: two states today, but the next status would need a column of its own and a rule for the combination. An enum costs the same now and grows by a value.
- **Freeze the whole project, status included, and reopen by support**: safest for the record, but an admin who marked the wrong project would have to ask the platform team, and RF-216 gives that decision to the people who answer for the project.
- **Freeze in the interface only**: a stale tab, another client or a future integration would still write to a delivered project. The rule lives in each route, next to the ones that already check membership.
- **Hide delivered projects from the list**: they must stay reachable, since the client and the contractor ask for their reports after the handover.
