# Floor ranges and assignment rules exist only in the draft, and the browser places the floors it adds

The team sets a tower up as floor ranges with their stacks, gives typologies by rule across towers, and adjusts disciplines before anything is saved. The server keeps knowing only locations ([0082](0082-the-structure-draft-lives-in-the-browser.md)), so every rule below lives in the browser, in one function that turns the draft into the list of locations for setting up and for adding floors.

A floor range is a first floor, a last floor and its stacks. The stacks are always the interval from the lowest to the highest one typed: `01, 04` is 01 to 04. A range may instead be marked as having no units, for a leisure or laundry floor; a range with neither is an error. A numbered floor exists only inside a range, two ranges of a tower never share a floor, and a tower with an invalid range generates nothing and counts nothing. Switching between numbers and letters converts the typed stacks by position; letters run from A to Z.

An assignment rule gives a typology to the units of chosen towers, stacks and floors, picked from what the draft has. "Todas as torres" means the towers of that moment. When ranges or towers change, a rule loses what no longer exists; a rule left without a tower or a stack blocks creation, and one that reaches no unit does not. Two rules reaching one unit are a conflict, even with the same typology: it is computed while the person edits, blocks creation and is reported per tower. The order of the rules decides nothing.

A discipline adjustment in the draft follows the batch of [0085](0085-a-discipline-batch-changes-only-what-it-names.md): it reaches the locations the draft had when it was applied, and turns on and off only the disciplines the dialog showed.

Adding floors accepts any floor number the tower lacks, below, between or above the ones it has. The browser sends each new floor with its position: right after the highest numbered floor below it or, with none below, right before the lowest numbered one. Floors without a number, such as Térreo and Cobertura, keep their place.

Requirements: RF-206, RF-207, RF-404

## Consequences

- **The server validates locations, not ranges**: it accepts any valid list, and a request built by another client is not held to these rules.
- **Stacks cannot skip**: a tower whose floors lack a stack in the middle is set up as two towers, or the unit is removed after creation.
- **The reservation the draft shows is units plus floor halls, entrance halls and the other common areas** ([0079](0079-common-areas-consume-the-reservation.md)), computed by the same function that builds the request, against the balance read from the server.
- **Floors and towers show no discipline list in the wizard**; they are born with their default and adjusted on their own pages ([0081](0081-a-discipline-applies-per-location.md)).
- **A typology of the draft is renamed, removed and copied in the wizard; one the project already has is only used and copied there**, and is edited in the configuration, where its version guards the edit ([0084](0084-a-typology-edit-on-a-stale-version-is-refused.md)).
- **The limit of 5,000 locations per request stays**, and the preview draws only the floors on screen.
- **The approved add-floors texts that said "above the last floor" are replaced.**

## Considered Options

- **Stacks as a free list** (`01, 03` without 02): the team asked for the interval, and a typed list hides a forgotten stack.
- **A floor without units only on the façade, after creation**: the approved rule; a leisure floor in the middle of a tower then costs a second pass.
- **A rule keeps what was chosen even after it is gone**: nothing is lost while experimenting, and a rule shows names of things that do not exist.
- **The first rule wins**: the order of a list decides which typology forty units get, with nothing on screen saying so.
- **An adjustment by floor follows the draft**: a unit added to that floor later would receive it, a second rule that exists only before creation.
- **Adding floors only above the last one**: the order never needs computing, and a missing floor in the middle is created one by one on the façade.
