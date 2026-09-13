# Plans and pins hang on any location, not only on units

Floors and common areas are first-class scopes: the hall, garage, party room and façade hold a large share of finishing issues. Towers, floors, units and common areas share one `location` table, a tree by `parent_id`. It is a model decision, not a screen decision: if plans and pins could only live inside a unit, adding floors and common areas later would be a migration.

## Consequences

- On the dashboard, common areas are not in the unit grid: they live in **their own strip**, measured by open pins, because they have no number, sale status or unit status cycle.
- Valid parent → child pairs are validated in the service; the database alone would accept a floor inside a floor.

## Considered Options

- Four separate tables: `plan` and `pin` would need polymorphic `owner_type` + `owner_id` columns without a real foreign key, and the database would stop guaranteeing integrity.

Requirements: RF-202, RF-405, RF-414, RF-702, RF-808
