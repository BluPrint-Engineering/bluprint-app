---
paths:
  - "apps/api/src/db/**"
  - "apps/api/drizzle/**"
---

# DB schema conventions

Reasoning lives in `docs/modelo-de-dados.md` — read it before touching the schema; where it disagrees with a migration, the migration wins. As of writing the only tables that exist are Better Auth's four (`user`, `session`, `account`, `verification`); the domain tables below don't exist yet (tracked in issue #5).

- **`src/db/schema/auth.ts` is generated — never hand-edit it.** It comes out of `bun run --filter @bluprint/api auth:generate`, which reads `apps/api/auth.config.ts`. Change the Better Auth options, regenerate, then `db:generate` the migration.
- **`casing: "snake_case"` must be declared in both `drizzle.config.ts` and `db/database.module.ts`.** In only one of them the migration and the runtime query disagree on the column name — it typechecks, it builds, and it fails on the first request. Runtime code gets the instance from `createDatabase()`; `drizzle-kit` runs in its own process and cannot import it, which is why there are two.
- **Pin IDs are client-generated UUID v7**, not server-assigned — needed for the offline queue (RF-508).
- **`x`/`y` are `decimal(8,6)`, normalized 0–1** — position on the floor plan as a fraction, not a pixel coordinate.
- **`project_id` on `pin` is deliberately denormalized** for tenancy checks, even though it's derivable through `location_id`.
- **The redundant `UQ(id, location_id)` on `plan` is not sloppiness — don't drop it** thinking it's dead weight; it's what lets a composite FK lock `location_id` on the referencing row.
- **There is deliberately no unique constraint on `plan(location_id, discipline_id)`** — more than one plan per discipline per location is allowed on purpose.
