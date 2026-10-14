# API tests transpile only; `tsc` owns their types

Supersedes the claim in [0007](0007-jest-for-api-vitest-for-web.md) that `ts-jest` reads the same `tsconfig` as the build; Jest as the API runner stands.

`ts-jest` type-checked every file while transforming it, and Jest's cache is not kept between CI runs, so the API unit suite paid a full type-check on each one: 41.9s on a cold cache locally, 3.6s without it. The inline `tsconfig` of the Jest transform in `apps/api/package.json` now sets `"isolatedModules": true`, which makes `ts-jest` transpile each file on its own and skip type-checking. It is set there, not through the deprecated `ts-jest` option of the same name.

**Type safety moves to `bun run typecheck`.** The API `typecheck` script runs `tsc -p tsconfig.typecheck.json`, which extends `tsconfig.json` and includes both `src` and `test`, so the spec files and the Jest setup file under `test/` are still type-checked; a spec that does not compile fails `typecheck` instead of `test`.

**The `isolatedModules` ban in [0002](0002-nestjs-over-hono.md) and [0003](0003-shared-zod-via-nestjs-zod.md) applies to the build `tsconfig` only**, and `tsconfig.typecheck.json` inherits it. The ban exists because `isolatedModules` makes `tsc` demand `import type` on a decorated parameter's DTO (ts1272), which erases the value `design:paramtypes` carries. Transpile-only never reports that semantic error, and `emitDecoratorMetadata` still comes from `tsconfig.json`, so a DTO imported as a value keeps its metadata in tests as in production.

## Consequences

- **Tests and the build no longer share one compile.** The build and `typecheck` still share `tsconfig.json`; the Jest transform differs only in `module`, `moduleResolution` and `isolatedModules`.
- **`bun run test` alone no longer proves the API compiles.** CI runs `typecheck` next to it, and so must anyone checking a change locally.
- **A file outside `src` and `test` that Jest loads is not type-checked** until it is added to `tsconfig.typecheck.json`'s `include`.
