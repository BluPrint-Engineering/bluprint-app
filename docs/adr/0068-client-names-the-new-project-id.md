# The client names a new project's id, so creating it twice creates it once

Creating a project consumes a paid license and a project is never deleted, so a create that runs twice loses a license for good. The page that creates a project generates the project's id (a UUIDv7, like the database default) when it opens and sends it with the name; `POST /api/projects` inserts with that id, and a repeated id in the same organization answers the project already created without consuming another license. A retry after a lost response, which is ordinary on a phone inside a building site, is therefore safe; locking the button only covers the double tap.

Requirements: RF-112, RF-201

## Consequences

- The `id` becomes part of the create contract in `packages/shared`, required and validated as a UUID.
- An id that already belongs to another organization is refused with a conflict that reveals nothing about that project.
- A future offline outbox for creation can replay the same request without any new rule, because the replay is the same id.

## Considered Options

- **Lock the button only**: what the signup does; a response lost after the project was created still turns the user's retry into a second project and a second license.
- **An `Idempotency-Key` header**: the general pattern, but it needs a key table, a retention rule and replayed responses for one route, where the primary key already gives the same guarantee.
- **A queue on the server**: the lost response happens between the phone and the API, before any server queue, and a queue still receives the request twice.
