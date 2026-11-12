# A typology carries a version, and an edit made on a stale one is refused

Saving a typology sends its whole ordered list of rooms, and the change reaches every location that follows it ([0072](0072-unit-type-is-linked-and-units-keep-their-changes.md)). With the last write winning, a person who opened the editor before a colleague saved removes the colleague's room from every unit without either of them seeing it. A typology therefore carries a version that rises on every change to its name or its rooms. A rename and a save of the rooms send the version the screen opened; the server refuses a stale one with `409 TYPOLOGY_CHANGED`, under the project's structure lock, and changes nothing.

The interface keeps what the person built, says that someone else saved, and offers the current list. Saving again writes over it, now as a choice.

Requirements: RF-205, RF-207

## Consequences

- **`typology.version`** is an integer that starts at 1; the typology list returns it.
- **Deleting sends no version**: a typology in use is already refused, and deleting an unused one loses nothing a stale screen could hide.
- **Copying sends no version either.** A copy is a new typology created with the rooms the dialog showed, through the route that creates one, so what the person checked is what is created ([0080](0080-one-typology-table-for-units-and-common-areas.md)).
- Nothing else in the structure has a version: a rename or a move of a location changes one row, and the last write winning there loses nothing.

## Considered Options

- **Last write wins**: no column, and one person's change disappears from every location in silence.
- **Merge the two edits**: no rework, and a rule for every pair of conflicting changes to the same room.
- **Send operations instead of the whole list**: concurrent edits compose, and the route, the editor and the retry rule all change for a case that is rare.
