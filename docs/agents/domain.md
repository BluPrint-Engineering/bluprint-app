# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`docs/requisitos.md` § Vocabulário**: the domain glossary. This repo uses one aggregate file instead of a standalone `CONTEXT.md` — same content, different container.
- **`docs/requisitos.md` § Decisões estruturais** and **`docs/ARCHITECTURE.md` § Por que cada escolha**: the decision log. Same reason — one aggregate file instead of `docs/adr/`.

## File structure

This repo is single-context: one vocabulary shared by `apps/web`, `apps/api` and `packages/shared`, which the shared Zod schemas already enforce.

```
docs/
├── requisitos.md        § Vocabulário (glossary) + § Decisões estruturais (decision log)
└── ARCHITECTURE.md      § Por que cada escolha (technical decision log)
```

Split into a `CONTEXT-MAP.md` with per-context `CONTEXT.md` files only when a term genuinely means two different things in two subsystems — a domain split, not a web/api split.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/requisitos.md` § Vocabulário. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag decision conflicts

If your output contradicts an existing entry in § Decisões estruturais or § Por que cada escolha, surface it explicitly rather than silently overriding:

> _Contradicts the "papel efetivo" decision in § Decisões estruturais, but worth reopening because…_
