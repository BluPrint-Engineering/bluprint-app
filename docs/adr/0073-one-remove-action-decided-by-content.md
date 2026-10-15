# One "remove" action; the location's content decides between delete and archive

Whoever removes a tower, floor, unit or common area does not need to know what is inside it. The menu has one "remove" action, and the server decides: a location with no content anywhere below it is deleted, and one with content is archived ([0036](0036-empty-structure-deletes-work-archives.md)). Content is pins, plans and filled-in unit data (status, contractor, planned start, sale status, notes), anywhere in the subtree and including archived descendants; structure, rooms and unit types are not content. Unit data counts because it is field work as much as a pin is, and deleting it would lose it as silently.

Requirements: RF-209, RF-210, RF-211, RF-212, RF-214

## Consequences

- **The interface says what will happen before it happens**: an empty leaf is deleted at once with an undo; an empty location with children asks to confirm with the count; a location with content asks to confirm archiving and names what it holds ("12 pins e 2 plantas").
- **Archived locations live in their own section of the project configuration**, listing only those archived on their own; a location archived with its parent comes back with it. Restoring is for a manager or the admin; a name taken meanwhile asks for a new name, and a location whose parent is archived waits for the parent.
- **Deleting an archived location for good** is for a manager or the admin, behind a dialog that counts what is lost and a confirmation box, like delivering a project.
- **Archiving ships with the first content**: until plans exist (epic #7) no location can hold content, so #6 delivers deletion and #7 delivers archive, restore and the archived list with real content to test against.
- A delivered project refuses every structure write, restore and permanent deletion included, because delivery is final ([0069](0069-delivering-a-project-is-final.md)).

## Considered Options

- **Separate "delete" and "archive" actions**: the action names its outcome, but the menu changes from item to item and a person looking for "delete" on a unit with a plan does not find it.
- **Only pins and plans count as content** (the wording of RF-209): a unit with its status, contractor and notes filled in but no pin yet would be deleted outright.
