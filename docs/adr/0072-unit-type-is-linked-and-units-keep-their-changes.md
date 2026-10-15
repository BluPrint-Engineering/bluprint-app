# A unit follows its unit type, and keeps the changes made on it

A unit type (*tipologia*) is a named list of rooms. The setup wizard assigns unit types by stack and floor range (stacks 01 and 03 on floors 1 to 11 take type A, stacks 02 and 04 take type B, floor 12 takes Cobertura). A unit stays linked to its type: adding, renaming or removing a room in the type reaches every unit of it, so a room forgotten at setup is fixed once. A single unit may still add rooms of its own, drop a room of its type, or change type, and those changes survive later edits to the type.

Requirements: RF-204, RF-207, RF-213

## Consequences

- **Rooms are rows per unit**, because a pin points at one room of one unit ([0041](0041-room-hangs-outside-the-location-tree.md)). A room created from the type remembers which room of the type it came from; renaming it in the type renames it in every unit and therefore on every pin and report.
- **A unit's own changes are recorded, not inferred**: a room dropped in one unit stays dropped when the type gains or renames rooms, and the unit shows how many changes it has and can return to its type.
- **Removing a room from the type never takes a room in use**: units where the room holds pins keep it as a room of their own (RF-213).
- A project where every unit is alike has one unit type, assigned to every stack and floor by default.

## Considered Options

- **Copy on creation**: each unit becomes independent after setup, a simpler rule, but fixing a forgotten room means selecting and editing every unit that has it.
- **Types by floor range only**: a shorter wizard, but the odd/even difference common in real towers becomes one manual exception per unit.
