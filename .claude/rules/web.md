---
paths:
  - "apps/web/**"
---

# `apps/web` conventions

- **`routeTree.gen.ts` and `components/ui/` are generated — regenerate them, don't hand-edit.** `routeTree.gen.ts` comes from the TanStack Router plugin; CI fails if the committed file is stale (`git diff --exit-code` after a fresh build). `components/ui/` is shadcn output — add a component with `bunx shadcn add <name>`.
- **`features/<x>/` vs `components/`.** A component belongs to `features/<x>/` until a **second** feature needs it — only then does it move to `components/`.
- **Four constraints apply to any UI work**, checked on every PR: interface text in pt-BR; large touch targets reachable one-handed; status and discipline never signalled by colour alone (a label, icon or legend alongside); colours legible over a light floor plan in direct sun.
