# The wizard's "Alterar reserva" returns focus to itself after a restored cancel

Amends [0089](0089-a-submission-kept-across-a-session-expiry-reopens-by-the-entry-that-sent-it.md).

0089 sent focus to the create button when a restored "Alterar reserva" of the structure wizard was cancelled, because the wizard's fields were not kept across a session expiry and the reservation the structure needed was no longer shown. The wizard now keeps its fields in its own draft ([0082](0082-the-structure-draft-lives-in-the-browser.md), [0086](0086-the-structure-draft-is-dropped-on-leaving-and-checked-after-a-lost-answer.md)): after the login of the same account it reopens with the draft and the kept reservation dialog together, so the over-reserve alert and its "Alterar reserva" are on screen again. Cancelling the restored dialog returns focus to "Alterar reserva", like every other entry; a successful save still puts focus on the create button, which the new reservation unblocks.

Requirements: RNF-04, RNF-12, RF-206

## Consequences

- **The wizard's two "Alterar reserva" rows in the restoration table** (setting up and adding floors) expect focus on "Alterar reserva" after cancel, restored or not.
- The rest of 0089 and 0093 stands: the reservation value stays in the session-expiry slot, and the draft stays in its own key.
