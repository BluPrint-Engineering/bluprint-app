# Code comments

**Default: no comment.** The code, its names, its types and its tests say what it does; an ADR or the commit says why it was decided. A comment is the exception, for what a competent reader would get wrong without it: a hazard, a unit, a workaround and where it came from. The burden of proof is on the comment — when unsure, leave it out, and a reviewer deletes one that doesn't clear this bar.

- **Rename before you comment.** A comment that says what something is or does means the name is wrong: rename, extract a variable or a function, assert the invariant, then drop the comment.
- **Rationale lives in an ADR or the commit.** A comment may carry the one-line hazard and cite its ADR as a suffix, `(ADR 0013)`. A comment that only points to an ADR says nothing: state the hazard or delete it.
- **One line.** A comment that needs a paragraph is an ADR or a commit body.
- **JSDoc only for a contract the signature can't express** — a unit, a precondition, a hazard — on a function or a shared type. Never on a React component or its props: the name and the type are the doc.
- **No comments in tests.** The test's name is its comment; a fixture that needs explaining needs a better name or its own test.
- **`TODO(#n)`** always carries its issue.
- **Comment only code you're writing or changing**, and when you change code, update or delete the comments that describe it.
- **What changed goes in the commit**, not the comment ("added", "now uses", "fixed").

Removed code is deleted, not commented out. Comments are in English. Lint and TypeScript directives (`biome-ignore`, `eslint-disable`, `@ts-expect-error`) aren't comments in this sense.

A `PreToolUse` hook denies an agent's edit that adds a comment to a test file, or JSDoc to a component or a prop in a `.tsx` file; everything else is judged against this file (ADR 0057).

## Cut

| Written | Why it goes |
| --- | --- |
| `/** The search the address holds. */ value: string;` | Restates the prop. `search` would have said it. |
| `/** The caller is the organization's admin, the only one who filters by manager. */ admin: boolean;` | Restates the prop, twice, in two files. `isAdmin` says the first half; the second is the component's business. |
| `/** The phone's controls: a row that sticks to the top as the list scrolls… */ export function ProjectsMobileToolbar` | Describes the component; the name and the JSX already do. |
| `// Diego manages Edifício Aurora and Condomínio Porto Belo…` above a test | Narrates the seed. The test's name, or a `const` named for the case, carries it. |
| ``/** Left out, the project is born `active`. */ status?: ProjectStatus`` | Restates `.default("active")` on the column in `project.entity.ts`. |

## Keep

| Written | Why it stays |
| --- | --- |
| `// grouped rather than DISTINCT: Postgres wants an ORDER BY expression in the DISTINCT list` | The next reader would "simplify" it back into an error. |
| `/** … ilike reads %, _ and \ as wildcards or escapes, so q is escaped to match itself. */` | A hazard the signature can't show. |
