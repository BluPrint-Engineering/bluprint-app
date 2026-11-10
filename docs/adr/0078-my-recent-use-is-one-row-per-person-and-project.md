# My recent use is one row per person and project

The project list used to open by creation date. Last activity is the last operational change by anyone, and opening a project does not move it, so the project someone spent the morning in can sit in the middle of the list. The list now defaults to that person's recent use.

My recent use is when a person last entered a project or changed it. It is per person and per project. It is not Last activity, and it is not a history of actions.

The timestamp cannot live on the project membership: an organization admin can open a project they are not a member of. It cannot live only in the browser: the phone and the computer must show the same order. A failed write of the timestamp must not fail the read the person actually came for.

## Consequences

- Table `project_use`: `user_id`, `project_id`, `last_used_at`. Composite primary key. Both foreign keys cascade.
- A successful project-scoped read or change records it, including creating the project and changing a reservation from the organization units screen. The project list, the units list and the managers list do not. A refused request does not.
- At most one write per person and project every 5 minutes, on the database clock, after the response is a success. A failure is swallowed.
- The list sort value is `myUse`, and it is the default. Order: `last_used_at` descending with nulls last, then `last_activity_at` descending, then id descending. The other three sorts stay. The label "Atividade recente" stays.

## Considered Options

- A column on `project_member`: misses the admin who is not a member, and ties the timestamp to membership.
- Ordering on the client from local visits: the two devices disagree, and a fresh browser has no order.
- Changing Last activity so that opening a project counts: that term is the crew's last operational change, and it stays that.
