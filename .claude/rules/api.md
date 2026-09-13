---
paths:
  - "apps/api/**/*.ts"
---

# `apps/api` conventions

The reasoning behind each rule is in the linked ADR; open it when a rule seems wrong before changing it.

- **A DTO import is a value import, never `import type`.** A type-only import compiles, lints and passes unit tests, then breaks dependency injection at runtime ([0003](../../docs/adr/0003-shared-zod-via-nestjs-zod.md)). `apps/api/src/health/` is the worked example.
- **Every controller method declares a response DTO** with `@ZodResponse({ status, description, type: SomeDto })` (or `type: [SomeDto]`), even a route with no input. A `z.iso.datetime()` field needs the service to return a string, not a `Date` ([0004](../../docs/adr/0004-response-dto-on-every-route.md)). `apps/api/src/projects/` is the worked example.
- **Controller → service → queries.** The controller declares the route, validates through a DTO and calls the service. The service holds the logic, never touches `Request`/`Response`/Express, and never calls Drizzle directly. Database access lives in `<domain>.queries.ts` as exported functions taking the `Executor` first, never an `@Injectable()` repository ([0005](../../docs/adr/0005-queries-take-the-executor.md)). Only a service injects `DATABASE`, and only to hand it (or a `tx`) to a query.
- **`*.spec.ts` is unit-only** (no DB, no HTTP); **`*.int-spec.ts`** boots the real `AppModule` against Postgres.
- **Every error is problem details** ([0047](../../docs/adr/0047-errors-are-rfc-9457-problem-details.md)). A failure the client acts on is `throw new ProblemException({ status, code, detail })` from the service, with a stable SCREAMING_SNAKE `code`; any other `HttpException` reaches the client as its status alone. `AllExceptionsFilter` and `RequestValidationPipe` are registered once in `app.ts`; removing either breaks the contract silently, and `app.int-spec.ts` is the first to catch it.
- **Every route is protected by default** by the global `AuthGuard`. Opt a public route out with `@AllowAnonymous()`; `health.controller.ts` is the only one.
- **Create the app with `nestApplicationOptions`** (`bodyParser: false`) in tests too. Better Auth reads the raw request stream, and `AuthModule` re-adds the parsers for every path except `/api/auth/*`.
- **`configureApp` runs before `app.init()`.** A pipe or filter registered later is ignored by routes already mounted, with no error.
- **Keep `disableTrustedOriginsCors: true`.** Without it the auth module calls `enableCors` during `init` and silently overrides the CORS set in `configureApp`.
- **Auth routes bypass Nest**: they skip `AllExceptionsFilter` and `RequestValidationPipe`. Their errors reach problem details only through `withProblemDetails` wrapping the handler in `createAuth` — drop the wrap and every auth error goes back to Better Auth's own body ([0010](../../docs/adr/0010-self-hosted-better-auth.md)).
- **A new route is documented in the same PR**: `@ApiTags` on the controller, `@ApiOperation({ summary, description })` and `@ApiErrorResponses(...)` for every documented failure status on the method, plus field descriptions via `.meta()` on the shared Zod schema. `openapi.int-spec.ts` fails a route that skips this ([0046](../../docs/adr/0046-openapi-via-nestjs-swagger.md)). A schema backing a `createZodDto` directly must not carry its own `.meta({ id })` — it collides with itself in `cleanupOpenApiDoc`; an `id` is only safe on a schema nested inside another.
