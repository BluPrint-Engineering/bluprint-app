# `pin.location_id` is denormalized and locked by a composite foreign key

`pin` carries `location_id` copied from its plan, locked by the composite foreign key `pin (plan_id, location_id) → plan (id, location_id)`. Counting open pins per unit resolves on an index without going through `plan`, and the database stops the two from disagreeing.

## Consequences

- `plan` has a redundant `UNIQUE (id, location_id)`: Postgres requires a unique on the referenced side to accept the composite foreign key. Do not drop it as dead weight.
- `pin.project_id` is also denormalized: it is the tenancy filter of every query and index.

Requirements: RF-603, RF-801
