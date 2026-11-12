# The structure draft lives in the browser, and an attempt is checked before it is edited or sent again

The structure wizard's draft must survive a reload until it is created or discarded. It is stored in the browser, per person, per project and per flow (setting up, or adding floors to one tower), holding only what the person typed. The server still knows nothing of ranges, stacks or assignment rules: the browser expands the draft into locations and sends one request with client-generated ids ([0071](0071-structure-is-edited-where-it-is-navigated.md)).

The draft also keeps the ids of its last attempt. After a request that ended without an answer, and when a draft is restored, the app asks the server whether one of those ids exists before it lets the person edit or send again. Creation is all or nothing, so one id answers for the whole attempt: found, the attempt succeeded and the draft is dropped; not found, the person goes on editing.

Requirements: RF-206, RNF-12

## Consequences

- **Nothing is saved before creating**: no draft table, no cleanup job, no rule for two people drafting the same project.
- **The draft does not follow the person to another device**, and is lost with the browser's data.
- **Facts from the server are read again on restore**: units left, floors the tower already has, names already used. A draft that stored them would restore stale.
- **A draft written by an older version of the app is discarded**, never read in part.
- **Editing after a lost answer can no longer create a second structure**, nor leave more on the server than the draft shows.
- A stack is not stored on the unit: after creation it lives in the unit's name, which stays free to change.

## Considered Options

- **A draft on the server, per person and project**: follows the person across devices, and becomes project data with a table, permissions and retention.
- **One shared draft per project**: needs a conflict rule for two people editing it.
- **An idempotency key per draft, stored on the server**: the same guarantee with a new table and a retention rule, where one read of an id already answers.
- **Resending the same ids only**: an edit after a lost answer fails on a taken name, or leaves floors the person removed from the draft.
