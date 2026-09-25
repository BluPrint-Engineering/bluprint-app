# Code comments

A comment earns its place by telling the reader what the code, its names and its tests can't: why it's this way, a hidden hazard, a unit or precondition, a workaround and where it came from. A comment that restates the code or only points elsewhere costs reading time and goes stale.

- **State the fact itself.** A line comment is one line.
- **Cite ADRs, don't point to them.** Append `(ADR 0013)` to a comment that already stands on its own; a comment that is only a reference to an ADR says nothing, so state the hazard or delete it. The ADR names the modules it governs, so the link runs from the decision to the code.
- **Prefer code over comment**: a clearer name, an explaining variable, an assertion for an invariant.
- **JSDoc** when it adds what the signature can't: a unit, nullability, a precondition, a hazard. It may span several lines when the contract needs them. JSDoc that restates parameter names or the return type stays out.
- **`TODO(#n)`** always carries its issue.
- **Comment only code you're writing or changing**, and when you change code, update or delete the comments that describe it.
- **What changed goes in the commit**, not the comment ("added", "now uses", "fixed").

Removed code is deleted, not commented out. Comments are in English. A test's name is its comment.
