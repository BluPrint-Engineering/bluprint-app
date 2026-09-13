# Empty structure is deleted easily; structure holding field work is only archived

An item with no content disappears immediately. An item with pins or plans is archived, never deleted: a construction photo cannot be retaken, and by the time someone notices the mistake the recorded problem may already be fixed.

## Consequences

- `archived_directly` distinguishes an item archived on its own from one archived in cascade, so restoring a floor does not resurrect a unit that was already archived before.

Requirements: RF-209, RF-210, RF-211, RF-212, RF-213, RF-214
