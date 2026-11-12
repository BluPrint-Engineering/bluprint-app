# A discipline batch changes only what it names, and an extra discipline takes its color from a fixed list

Settles what [0081](0081-a-discipline-applies-per-location.md) left to the Local screen: how a batch says what it changes, what a tower means in a batch, and how a discipline created outside the project configuration gets its name, id and color.

A batch carries the disciplines to turn on and the disciplines to turn off, both chosen by the person in the dialog. A discipline the request does not name stays as it was at every location. "The list is exactly this" would turn off a discipline another person created while the dialog was open, on forty units, without anyone having seen it on the screen. A floor as target is its units and common areas; a tower is the units and common areas of its floors plus the tower's own common areas. A common area of the project is reached only as a chosen location. When a chosen location no longer exists the whole batch is refused.

A discipline is created with an id chosen by the client, like a project ([0068](0068-client-names-the-new-project-id.md)): sending the id again returns the discipline already created. Its name follows the rule of rooms and typologies ([0083](0083-room-and-typology-names-ignore-accents.md)): unique in the project ignoring accents, case and repeated spaces, enforced by the database, and never "Geral". Its color is the first unused one of a fixed, ordered list of ten, so a project holds at most ten extra disciplines until the configuration (#8) brings the color picker.

Requirements: RF-402, RF-403, RF-404

## Consequences

- **The batch is one route for the three targets**, and the server resolves a floor or a tower when it commits. Sending it twice changes nothing the second time.
- **A discipline created for the whole project is on at every unit and common area**, including those a batch had just left with a shorter list: a batch is not a promise about disciplines that do not exist yet.
- **The ten colors, in order**: `#0D9488`, `#7C3AED`, `#DB2777`, `#15803D`, `#DC2626`, `#0891B2`, `#4338CA`, `#4D7C0F`, `#A21CAF`, `#92400E`. No screen shows them before the first pin (#7), so #8 may still revise them.
- **The eleventh extra discipline is refused** with `DISCIPLINE_LIMIT_REACHED`, and the interface replaces "Nova disciplina" with the reason once the project has ten.
- **Each toggle is its own write**, one location and one discipline, so two people changing different disciplines of one location do not overwrite each other. A toggle back to the default deletes the exception.
- **A location's disciplines come resolved in the read of the location**; the interface never computes a default. The rule "the exception, otherwise the default" is one shared function, which the wizard preview also uses before anything is saved.
- **Creating a discipline, a toggle and a batch are structure writes**: they move the project's last activity and the person's recent use.
- `DISCIPLINE_HAS_CONTENT` is reserved for the refusal of 0081 when a plan or a pin exists, and ships with epic #7.

## Considered Options

- **A batch that sets the exact list**: simpler to say, and it turns off what the person never saw.
- **A tower means only what sits on its floors**: the tower's party room would change only on its own page, against "the units and common areas under it" of 0081.
- **Apply to the locations that still exist and skip the missing one**: the count the person confirmed no longer matches what changed.
- **The server names the discipline's id**: a retry after a lost answer reads as "the name is taken".
- **No cap, colorless when the list runs out**: against 0081, where a discipline is born with a color.
