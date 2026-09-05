---
paths:
  - "apps/api/**/*.ts"
---

# `apps/api` conventions

- **A DTO import is a value import, not a type import.** `import { HealthQueryDto } from "./dto/health-query.dto"` — never `import type`. A type-only import compiles clean and passes lint and unit tests, then breaks Nest dependency injection **at runtime**: `emitDecoratorMetadata` is what hands the class to the global `ZodValidationPipe`, and `import type` erases the value `design:paramtypes` needs. `apps/api/src/health/` is the worked example.
- **Controller vs service vs `db/`.** A controller declares the route, validates input via a DTO, and calls the service — never a query, never business logic. A service holds the logic and never touches `Request`/`Response`/Express — that's what lets it be tested by instantiating the class (`health.service.spec.ts`). `db/` is touched only by services; `DatabaseModule` is `@Global()` and exports the Drizzle instance under the `DATABASE` token.
- **`*.spec.ts` vs `*.int-spec.ts`.** `*.spec.ts` is unit-only, no DB, no HTTP. `*.int-spec.ts` boots the real `AppModule` against Postgres (`app.int-spec.ts`). `bun run test` runs both; `test:unit` never needs the container up, `test:int` always does.
- **Error contract.** `AllExceptionsFilter` in `common/filters/` is what turns Nest's verbose default error body into `{"error": "..."}`. It's registered once, in `app.ts`. If it's removed, the contract silently breaks — the web client throws on any non-2xx without reading the body.
- **`configureApp` runs before `app.init()`.** A pipe or filter registered after `app.init()` is ignored by routes already mounted, with no error.
