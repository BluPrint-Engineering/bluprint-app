---
paths:
  - "apps/web/**"
---

# `apps/web` conventions

- **`routeTree.gen.ts` is generated — regenerate it, don't hand-edit.** It comes from the TanStack Router plugin; CI fails if the committed file is stale (`git diff --exit-code` after a fresh build).
- **`components/ui/` is shadcn output, but not read-only.** Add a component with `bunx shadcn add <name>`, then edit it to match the design system's tokens (`apps/web/src/styles/globals.css`) — sizes, radii and colors are expected to change. To pull an upstream update later, use `bunx shadcn diff <name>` and merge by hand; never `--overwrite`, it discards those edits.
- **An API failure is an `ApiError`; branch and translate on `error.problem?.code`**, never on `message` or `detail`, which are English developer text ([0047](../../docs/adr/0047-errors-are-rfc-9457-problem-details.md)).
- **`features/<x>/` vs `components/`.** A component belongs to `features/<x>/` until a **second** feature needs it — only then does it move to `components/`.
- **Four constraints apply to any UI work**, checked on every PR: interface text in pt-BR; large touch targets reachable one-handed; status and discipline never signalled by colour alone (a label, icon or legend alongside); colours legible over a light floor plan in direct sun.
