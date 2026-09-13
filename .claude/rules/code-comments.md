# Code comments

A comment earns its place only when it is load-bearing: deleting it loses something the code cannot say. Three kinds qualify:

- **Why**: the reason for a non-obvious choice. `// retry 3x: upstream returns 502 during cold start`
- **Hidden hazard**: an ordering, side effect or coupling the signature can't show. `// configureApp runs before app.init(); pipes registered later are silently ignored`
- **Deliberate omission**: what the code intentionally leaves out. `// unsorted: the caller orders by locale`

Rationale that is long or already recorded gets a pointer instead of a retelling: `// see docs/adr/0005-queries-take-the-executor.md`. Scaffolding carries its issue: `// TODO(#11): remove with self-signup`.

A comment that only restates the line means the name needs work: rename, and drop the comment. History lives in git, and removed code is deleted. Comments are in English, and a test's name is its comment.
