# A submission kept across a session expiry reopens by the entry that sent it

Amended by [0090](0090-the-restoration-table-runs-the-full-sequence-once-per-kind.md): the table is one file per screen group, every entry keeps a row that restores it alone, and the full hostile sequence runs once per kind and on an entry that opens by address instead of on every row; the rest stands.

Completes the rule the app has kept since the session started to expire after 8 hours without use ([0077](0077-sessions-end-after-8-hours-without-use.md)): when a save with fields answers that the session is gone, the app keeps what was sent, one slot per account and screen (pathname and search), the latest failure replacing the earlier one, and once the same account signs in again the screen reopens that form with those values. Each form reads the slot when it opens and uses it as its initial value; it is not a live record. Nothing is sent again after the login.

What this record fixes on top of that:

- **The form reopens by the entry that sent it.** An entry is each button, row or menu item that opens a form, counted per screen. Two entries may open the same dialog and send the same kind of submission: only the one that sent reopens, with the kept value, and every other entry stays closed and opens with the value of the server, before and after the restored form is cancelled. A submission records its entry when the variables alone do not tell it apart, as the "Alterar reserva" of a duplicate, of an add row or of a menu-opened add form does; a kept reservation change without its entry opens nothing on a location screen.
- **Cancel forgets.** Cancelar, Esc, a tap outside, a successful save and leaving the screen empty the slot. A reload afterwards reopens nothing, and opening the same form again shows the server's value.
- **Focus returns to the entry.** Closing a restored form, by cancelling or by saving, puts focus back on the entry that opened it; when a save removes that entry, focus stays in the form that held it.
- **An action without fields does not come back.** Delivering, deleting, moving, undoing, removing and giving back a room, returning to the typology and deleting a typology keep nothing, reopen nothing and are not repeated.

The contract is proven by a hand-written table with one row per entry and per screen (`apps/web/src/routes/_authenticated/sessionRestore.test.tsx`), each row running the same hostile sequence against the real route tree with the network replaced. A test fails when a kind of kept submission has no row. A new entry of a kind that already has rows adds its own row; review holds that line.

Requirements: RNF-04, RNF-12, RF-511, RNF-21

## Consequences

- **Every new form with fields that sends adds a row to the table** in the same pull request, with its screen, how it opens, what it sends and where focus returns.
- **The table is the slowest web test file.** Each row signs in three times and opens every other entry of its screen; the cost buys the cross-entry invariants that broke in #235.
- **A form dialog takes the element focus returns to** instead of relying on the element focused before it opened, which is missing when the dialog opens restored or from a menu item that closes first.
- **The wizard keeps its own draft** ([0082](0082-the-structure-draft-lives-in-the-browser.md)); its "Alterar reserva" stays in the slot and, since the wizard's fields are not kept there, focus returns to the create button when the reservation that the structure needed is no longer shown.

## Considered Options

- **One representative form per mechanism**, as the first version of the slot did: the entries that share a dialog and a kind were never exercised together, which is where #235 found a draft reopening another entry's dialog, a fix breaking a sibling entry and an unopened dialog showing another's value.
- **Keeping every keystroke** instead of the failed submission: it keeps what the person never chose to send and needs a live record per field.
- **Restoring actions without fields**, re-running them after the login: a delivery or a removal repeated without the person seeing it again.
