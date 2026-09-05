---
paths:
  - "apps/api/src/db/**"
  - "apps/api/drizzle/**"
---

# DB schema conventions

Reasoning lives in `docs/modelo-de-dados.md` — read it before touching the schema; where it disagrees with a migration, the migration wins. As of writing, `apps/api/src/db/schema/index.ts` is empty (`export {}`) and `apps/api/drizzle/0000_init.sql` is a placeholder — the tables below don't exist yet (tracked in issue #5).

- **Pin IDs are client-generated UUID v7**, not server-assigned — needed for the offline queue (RF-508).
- **`x`/`y` are `decimal(8,6)`, normalized 0–1** — position on the floor plan as a fraction, not a pixel coordinate.
- **`project_id` on `pin` is deliberately denormalized** for tenancy checks, even though it's derivable through `location_id`.
- **The redundant `UQ(id, location_id)` on `plan` is not sloppiness — don't drop it** thinking it's dead weight; it's what lets a composite FK lock `location_id` on the referencing row.
- **There is deliberately no unique constraint on `plan(location_id, discipline_id)`** — more than one plan per discipline per location is allowed on purpose.
