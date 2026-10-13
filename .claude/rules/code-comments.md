# Code comments

The default is no comment. Code that needs one usually needs a better name, a type or a test instead, and a comment that restates the code costs every later reader and goes stale. Agents copy the comment density of the code around them, so each comment kept here invites more.

In source, a comment is kept only when it states one of these, in one line:

- **An outside hazard**: non-obvious behaviour forced by something we cannot reshape, such as a dependency, platform, vendor or protocol. A surprise in our own code is not commented: a rename, an extraction, a type or a redesign makes it obvious.
- **A workaround and its source**: the bug, version or upstream issue that forced it.
- **A tool directive**: `prettier-ignore`, coverage ignores, `/// <reference>`, with its reason where the tool expects it. A suppression (`biome-ignore`, `eslint-disable`, `@ts-expect-error`, `@ts-ignore`) is kept only for a rule that is faulty, pedantic or style-only; one that silences a rule catching real bugs or guarding correctness or safety is removed and the code fixed.
- **`TODO(#n)`**, carrying its issue.

When in doubt whether a comment fits, delete it.

Everything else goes where it lasts: a name (`timeoutMs`), an explaining variable, a type, an assertion, a test named after the case, the commit body, or an ADR. A unit or precondition is a type (a branded `Meters`) or an assertion, never a comment. A constraint such as "do not remove" or "talk to X before changing" becomes a type, a test or a lint that enforces it. JSDoc follows the same list. The no-mistakes review step checks every comment a diff adds or touches against this list (ADR 0060).

**Test files carry no comments** beyond tool directives and `TODO(#n)`: the test's name, its `describe` and named helpers say what it does. `.claude/hooks/comment-guard-tests.ts` refuses an Edit or Write that adds one (ADR 0057).

A comment citing a decision states the fact and appends `(ADR 0013)`; the ADR names the modules it governs, so a bare pointer to it says nothing. What changed goes in the commit, not the comment. When code changes, delete or fix the comments that describe it. Removed code is deleted, not commented out. Comments are in English.
