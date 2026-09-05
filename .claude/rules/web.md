---
paths:
  - "apps/web/**"
---

# `apps/web` conventions

- **`routeTree.gen.ts` and `components/ui/` are generated — regenerate them, don't hand-edit.** `routeTree.gen.ts` comes from the TanStack Router plugin; CI fails if the committed file is stale (`git diff --exit-code` after a fresh build). `components/ui/` is shadcn output — add a component with `bunx shadcn add <name>`.
- **`features/<x>/` vs `components/`.** A component belongs to `features/<x>/` until a **second** feature needs it — only then does it move to `components/`. Never promote in advance; it's what keeps `components/` reliably reusable.
- **Four RNFs apply to any UI work**, checked on every PR: RNF-05 interface text in pt-BR, RNF-06 large touch targets reachable one-handed, RNF-07 status/discipline never signalled by colour alone (label, icon, or legend alongside), RNF-08 legible over a light floor plan in direct sun.
