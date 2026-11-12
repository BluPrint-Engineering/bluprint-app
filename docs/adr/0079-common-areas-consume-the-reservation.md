# A common area consumes the reservation like a unit, and is still not a unit

Supersedes "Only units count" in [0074](0074-a-license-is-units-and-each-project-reserves-its-own.md); the rest of 0074 stands.

Halls, corridors, garages and party rooms hold plans and pins like apartments do, so the team asked for them to be tracked and paid for the same way. Every common area a person creates now uses one unit of the project's reservation, at creation. It stays a common area: no unit number, no status, no sale status. Used units are the project's existing units and common areas, plus those removed after holding content.

Requirements: RF-218, RF-219

## Consequences

- **One count, one place.** The check that already guards unit creation counts units and common areas together, so the wizard, add floors, add, duplicate and undo are covered without a rule of their own. The refusal stays `409 NO_UNITS_LEFT`, all or nothing, under the project lock.
- **No second flag.** Not creating the common area is the way not to pay for it. "Hall em cada andar" starts unchecked for that reason.
- **Spent is sticky for common areas too.** One removed without ever holding content returns its place; one that held content stays used. Content on a floor marks the units and the common areas below it. This ships with the first content (epic #7).
- **Existing common areas count.** The migration raises a project's reservation to its used units where it falls below, and fails if an organization would exceed its contracted units. A delivered project keeps the reservation it was delivered with.
- Towers, floors and rooms stay free.

## Considered Options

- **Only halls and corridors consume**: a garage with plans and pins is tracked the same way, and the rule would need a category on every common area.
- **Consume at the first plan or pin**: the reservation would move during field work, where nobody is looking at it.
- **Count only common areas created after the change**: a mark on every common area that never leaves the model.
