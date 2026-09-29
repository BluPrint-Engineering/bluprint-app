# Code comments

The default is no comment. Code that needs one usually needs a better name, a type or a test instead, and a comment that restates the code costs every later reader and goes stale. Agents copy the comment density of the code around them, so each comment kept here invites more.

In source, a comment is kept only when it states one of these, in one line:

- **A hidden hazard**: behaviour a reader would get wrong from the code alone.
- **A unit or precondition** that no name, type or assertion can carry.
- **A workaround and its source**: the bug, version or upstream issue that forced it.
- **A tool directive**: `biome-ignore`, `eslint-disable`, `@ts-expect-error`, `prettier-ignore`, coverage ignores, `/// <reference>`, with its reason where the tool expects it.
- **`TODO(#n)`**, carrying its issue.

Everything else goes where it lasts: a name (`timeoutMs`), an explaining variable, a type, an assertion, a test named after the case, the commit body, or an ADR. JSDoc follows the same list.

**Test files carry no comments** beyond tool directives and `TODO(#n)`: the test's name, its `describe` and named helpers say what it does. `.claude/hooks/comment-guard-tests.ts` refuses an Edit or Write that adds one (ADR 0057).

A comment citing a decision states the fact and appends `(ADR 0013)`; the ADR names the modules it governs, so a bare pointer to it says nothing. What changed goes in the commit, not the comment. When code changes, delete or fix the comments that describe it. Removed code is deleted, not commented out. Comments are in English.
