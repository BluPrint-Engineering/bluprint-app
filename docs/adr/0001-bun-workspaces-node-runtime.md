# Bun workspaces, with the API running on Node

The repo is a Bun workspaces monorepo: Bun is the package manager and the script runner, but `apps/api` runs on Node. `packages/shared` has a build step that publishes `dist/`, and every root script builds it first, because both apps consume it from there.

## Consequences

- Jest and the Nest CLI carry Node shebangs even when Bun launches the script, so CI pins both Bun and Node (see [0014](0014-node-24-9-floor.md)).
- A bare `bunx vitest` or `tsc` inside a workspace needs `bun run --filter @bluprint/shared build` first, or `@bluprint/shared` fails to resolve.
