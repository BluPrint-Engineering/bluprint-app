# One typology table serves units and common areas, and the database keeps them apart

Extends [0072](0072-unit-type-is-linked-and-units-keep-their-changes.md) to common areas and renames its tables.

A project has two catalogs of *tipologias*: one for units and one for common areas. Their names are unique across both, and a unit never follows a common-area typology, nor the reverse. They live in one table, `typology`, with a `location_type` column that is `unit` or `common_area`. A common area follows its typology by the rules a unit follows (0072): a change to the typology reaches every location of it, and a location keeps the rooms it added, dropped or renamed.

`unit_type` becomes `typology` in tables, columns, routes and shared types. A table called "unit type" that holds the typology of a hall is a name every reader would have to be told about, and there is no customer data to migrate yet.

Requirements: RF-204, RF-207

## Consequences

- **The existing unique index on the name covers both catalogs.** Two tables could not enforce a name unique across them in the database.
- **The foreign key from `location` to `typology` includes the type**: `(typology_id, project_id, type)` references `(id, project_id, location_type)`, so a location following a typology of another kind is refused by the database even when the service is wrong.
- **One implementation of the link rules.** `room.typology_room_id` and `dropped_room` serve common areas with no fork of the room logic.
- The rename ships alone, before any behaviour change, so its diff is mechanical.
- A typology carries no disciplines; copying one copies its rooms only ([0081](0081-a-discipline-applies-per-location.md)).

## Considered Options

- **Two tables, one per catalog**: the cross-catalog name rule lives only in code and the room logic is duplicated.
- **One table, kind checked only in the service**: simpler, and one bug puts an apartment typology on a hall.
- **Keep the name `unit_type`**: no rename PR, and a wrong name for good.
