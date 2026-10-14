# ESLint + Prettier in the API, Biome everywhere else

Biome runs no type-aware rules, and the API needs exactly those: `no-floating-promises` in an `async` service, `no-misused-promises` in a handler. In the web app, where the rules that matter are React rules, Biome keeps winning as a single binary. The split is also forced: `typescript-eslint` does not support the native TypeScript 7 compiler, which exposes no JavaScript API, so running ESLint at the root would mean downgrading TypeScript for the whole monorepo.

## Consequences

- Both tools use tabs and double quotes: the boundary is tooling, not style.
- ESLint has no native equivalent of Biome's automatic `organizeImports`.
- ESLint in `apps/api` is type-aware, so it needs `packages/shared` built; without it, `@bluprint/shared` resolves as `any` and the rules degrade silently. The root `lint` and `lint:fix` scripts build it first, same as every other root script.
- **The API stays on TypeScript 5.9.x while the rest of the monorepo is on 7.0.x** (`apps/api/package.json` pins `typescript` 5.9.3; the root, `apps/web`, `apps/e2e` and `packages/shared` pin 7.0.2). `typescript-eslint` is the reason, so aligning the API's version would break its lint. The API can move to TypeScript 7 once `typescript-eslint` supports the native compiler. Open question: no issue or date tracks that.
