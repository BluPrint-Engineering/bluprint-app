# NestJS over Hono

Hono was the right fit while the runtime was Bun: a minimal framework with conventions left to us. On Node the comparison changed. We would either rebuild dependency injection, module boundaries, guards and error filters ourselves, or use a framework that ships them and enforces them by construction instead of by code review. What decided it was what lies ahead: per-project roles become guards, Better Auth becomes a module, and the route/service boundary stops being an agreement and becomes structure.

## Consequences

- Decorators take `apps/api` out of the monorepo's base `tsconfig`: `emitDecoratorMetadata` on, `verbatimModuleSyntax` and `isolatedModules` off (see [0003](0003-shared-zod-via-nestjs-zod.md)).
- A build step instead of running `.ts` directly, and `--watch` with restart instead of hot reload.

## Considered Options

- Hono on `@hono/node-server`: keeps the existing code, and buys none of the above.
