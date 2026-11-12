# The structure draft is dropped on leaving, and a lost answer is checked before a resend or an edit

Settles what [0082](0082-the-structure-draft-lives-in-the-browser.md) left to the structure wizard: when the draft ends, what two tabs do with one draft, and how the attempt check reaches the person.

The draft is written on every change, for setting up and for adding floors alike, and carries a version number. It ends when the structure is created and when the person discards it. Leaving the wizard by any path inside the app asks "Descartar o que você montou?" when the draft has changes, and leaving discards it. Closing the tab, reloading and an expired session keep it. Signing out, or another account signing in on the same browser, deletes it, which is the rule the app already applies to a submission kept across a session expiry. A draft whose project already has a structure, whose tower no longer exists, or whose project was delivered is deleted with a notice, because the wizard can no longer open for it.

A tab that sees the draft change in another tab stops taking edits and offers to load the latest version. Nothing is merged.

A request refused by the server with a known code returns to editing with the error. A request that ended without an answer, or with one that is not a known refusal, locks the form. "Tentar de novo" asks the server whether the attempt exists and, when it does not, sends the same request in the same tap. "Voltar a editar" runs the same check before it unlocks the form. A reload in that state runs the check before the form shows. The check reads the first location of the attempt by its id, on the route that already reads a location.

Requirements: RF-206, RNF-12

## Consequences

- **The wizard leaves the session-expiry submission store.** The draft already holds what that store kept for it; adding a unit, duplicating and the other forms stay there.
- **"Nada foi salvo" is said only when the server answered.** Without an answer the interface says it could not confirm, and that nothing is created twice.
- **The step on a phone and the location under check live in the URL**, so the device's back button goes back one step or closes the check instead of leaving the wizard and meeting the discard question.
- **A change to the draft's shape raises its version**, and a draft of another version is deleted whole. A test fails when the shape changes and the version does not.
- **No new route.** The check costs one read that records project use like any other.
- **A draft is not kept for a person who signed out**: an hour of setting up is lost with the sign-out, and the app holds nothing of a person who left the device.

## Considered Options

- **Keep the draft hidden per account until its owner returns**: nobody loses a draft to a shared tablet, at the cost of data of a signed-out person staying on the device and a second rule beside the one that exists.
- **Ask only on the wizard's back link**: every other path would leave a draft behind without the person knowing.
- **Last write wins between tabs**: a person creates the structure from the tab that is not the latest.
- **"Tentar de novo" only checks, and the person taps create again**: two taps on the common path, where the signal is back and nothing was created.
- **No way back to editing after a lost answer**: a person who saw a mistake in the draft waits for the signal to fix it.
