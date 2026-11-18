# The restoration table runs the full sequence once per kind

Amends [0089](0089-a-submission-kept-across-a-session-expiry-reopens-by-the-entry-that-sent-it.md).

The contract is proven by a hand-written table with one row per entry and per screen, split into one file per screen group under `apps/web/src/routes/_authenticated/sessionRestore/`. Every row restores its own entry after a real expiry against the real route tree: only that form opens with the kept value, one request is sent, Cancelar forgets (also after a reload), and focus returns to the entry. One row per kind of kept submission (`sessionDraftKinds`), on one screen chosen for that kind, also runs the full hostile sequence: every other entry of the screen shows the server value, a restored save returns focus and is sent once more, and another account sees nothing. An entry whose form opens by address runs the full sequence too. A test fails when a kind does not have exactly one such row, when an entry that opens by address is not a full row, or when a screen group has no file.

Every row whose entry returns focus also opens, cancels and saves it with no session lost, so focus after a save stays proven per entry.

## Consequences

- **Every new form with fields that sends adds an entry row** in the same pull request, with its screen, how it opens, what it sends and where focus returns; the first entry of a new kind is also that kind's full row.
- **The rows, the screens and the sequences live in `apps/web/src/test/sessionRestore.ts`**; a file of the folder only names its screen group, so the groups run in parallel.
- **The table stops setting the length of the web suite.** As shipped, with the plain-focus rows on every entry that returns focus, the web suite went from 580 s to 289 s on 4 pinned cores (1206 tests), and a new entry costs about 4 s of test time, spread over the files, instead of about 10 s in one serial file.
- **What only a full row proves is proven once per kind**: the other entries of the screen from that entry's kept submission, the save of a restored form and the other account. Keeping, the kind check, the account check and forgetting on success live in the slot and its reader, with no code per entry; the focus a save returns is per entry and stays proven by the save with no session lost.

## Considered Options

- **Running the full sequence for every entry**: ~10 s per entry in one serial file. Mutation testing on the 12 entry-wiring defect shapes seen in #235 and #257 found no defect that the per-entry full sequence caught and the entry row missed.
- **Splitting the file and keeping the full sequence on every row**: no check is dropped, but in the earlier measurement on 4 pinned cores, before the plain-focus rows were extended, the suite took 331 s where the trimmed one took 264 s (545 s before the change), and each new entry costs three to four times more.
- **Dropping the reload from the entry row**: a Cancelar of "Alterar reserva" that does not forget then goes unseen on 6 of its 10 entries, the add rows and the wizard, which do not read the slot again when opened a second time.
