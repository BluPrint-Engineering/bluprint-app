# Code comments

Default: no comment. Add one only when deleting it would lose something a reader of the code, the function or variable's own name, its test and the ADRs cannot get back.

- **One line, maximum — JSDoc included.** Longer rationale belongs in an ADR; point to it: `// see docs/adr/0051-transaction-aware-repositories-via-cls.md`.
- **Always allowed**: a `// see docs/adr/...` pointer, and `TODO(#n)` for scaffolding.
- **JSDoc** only when it states something the signature can't: a hidden hazard, a unit, a precondition. Never a JSDoc that restates the parameter names or return type.
- **Never** restate what an issue or an ADR already says, and never restate what the code already says — rename instead.

History lives in git; removed code is deleted, not commented out. Comments are in English. A test's name is its comment.
