# A discipline applies per location: a default on the discipline, exceptions on the location

Narrows RF-404: a discipline still belongs to the whole project, but where it applies is decided per location.

The team needs to say which disciplines exist in each unit and common area, and floors and towers must not start cluttered with every extra discipline. A discipline records its type (`general`, `base` for Hidráulica and Elétrica, or `extra`) and whether it applies everywhere or only where it is turned on. That choice is made when the discipline is created and does not change. A location stores only its exceptions: "on here" or "off here". What applies at a location is the exception when there is one, otherwise the default: for a unit or common area, the discipline's own; for a floor or tower, the base disciplines only. General is never listed and always applies.

Requirements: RF-401, RF-402, RF-404, RF-414

## Consequences

- **Tables**: `discipline` gains `type` and `applies_everywhere`; `location_discipline (location_id, discipline_id, applies)` holds the exceptions and never a row for General. The `discipline` table and the three default disciplines of every project arrive with this work, ahead of epic #8.
- **Defaults cost no writes.** Creating 500 units or one discipline writes no row per location, and no creation path can forget to turn a discipline on.
- **A discipline used in one place is one row**: created as "only where turned on", then turned on there. Locations created later start without it.
- **Floors and towers have their own list**, independent of the units below: turning a discipline off on a floor does not touch its units.
- **A discipline with a plan or a pin on a location cannot be turned off there**; turning on is always allowed. A location with no specific discipline takes no new pin, not even on the General plan. The server refuses a plan or a pin for a discipline that does not apply at its location. These ship with the first content (epic #7).
- **A batch applies one list to chosen locations, a floor or a tower**, all or nothing, and the refusal names the locations. A floor or tower means the units and common areas under it when the batch commits, resolved by the server, and not the floor or tower itself.
- **Duplicating a location copies its exceptions.**
- **A discipline created in the structure wizard asks only for its name.** It takes the next free color and no plan of its own; both are edited in the project configuration (RF-402).

## Considered Options

- **Store what applies, one row per location and discipline**: every new location and every new discipline writes hundreds of rows, and a path that forgets leaves a location silently without a discipline.
- **Store only what is off**: no way to have a discipline that exists in one location without a row on every other.
- **Applicability on the typology**: locations of one typology differ, and the product decision was per location.
- **Floors and towers accept every discipline**: the floor plan would offer disciplines nobody uses there.
- **Changing the default after creation**: flips every untouched location at once, with nothing showing which.
