# OpenAPI via `@nestjs/swagger`, served as Swagger UI, replaces the Bruno collection

Supersedes [0017](0017-bruno-as-api-documentation.md).

The API is documented as an OpenAPI document generated from the running code by `@nestjs/swagger`, served as Swagger UI at `/api/docs` (JSON at `/api/docs/openapi.json`) via `setupApiDocs` in `src/openapi.ts`. `nestjs-zod`'s `createZodDto` already backs every DTO ([0003](0003-shared-zod-via-nestjs-zod.md)), and generates its OpenAPI schema straight from the same shared Zod schema that validates the request and shapes the response — the documentation cannot drift from the contract the way a hand-maintained `.bru` file could. `@ZodResponse()` (replacing `@ZodSerializerDto()`) keeps the ADR 0004 serialization guarantee and adds the response's OpenAPI entry in one decorator; `@ApiErrorResponses()` documents error statuses as problem details ([0047](0047-errors-are-rfc-9457-problem-details.md)).

Better Auth's routes never go through Nest's router, so the scanner cannot see them. Only the three on the happy path — sign-up, sign-in, session — are hand-documented in `src/auth/auth.openapi.ts` and merged into the generated document, the same scope `collection.bru` used to cover and for the same reason: it is what you want at hand on the first cookie error, and the dozens of other generated (and currently inert) routes would be maintenance with no reader.

The env flag `API_DOCS_ENABLED` defaults to on outside `NODE_ENV=production` and off inside it, so the route map is not public once the first deploy lands ([0015](0015-hosting-and-providers-deferred.md)).

## Consequences

- Swagger UI's assets are served locally by `@nestjs/swagger`, no CDN and no inline script, so it needed no exception in helmet's CSP.
- `SwaggerModule.setup` mounts its routes straight on the underlying Express instance, bypassing the global `AuthGuard` by construction — there is no Nest controller for a guard to attach to. It is mounted after `app.use(helmet())` and `app.enableCors()` in `configureApp` on purpose: mounted earlier, its routes would answer before that middleware ever runs.
- A Zod object schema must not carry its own `.meta({ id })` when it backs a `createZodDto` directly: `nestjs-zod`'s root-wrapping for named schemas collides with itself during `cleanupOpenApiDoc`, throwing `Found multiple schemas with name`. An `id` stays fine on a schema only ever nested inside another (`projectAccessRoleSchema` inside `projectSummarySchema`).
- The recommended entry point is `http://localhost:5173/api/docs`, through the Vite proxy — same origin as the web app, so Try it out sends the session cookie and the browser sets `Origin` itself, sidestepping the `Origin: null` problem the Bruno collection worked around by hand.
- A new route enters the OpenAPI document in the same PR that creates it: `@ApiTags`, `@ApiOperation`, `@ZodResponse`, and `@ApiErrorResponses` for every documented failure status. `openapi.int-spec.ts` fails a route that skips this.

## Considered Options

- Keep Bruno: a separate, hand-maintained artifact that already drifted from wanting per-machine tooling that broke for this team.
- Scalar UI over the same generated document: a nicer interface, but pulls its script from a CDN and needs a CSP exception, unnecessary while Swagger UI's own bundle is same-origin.
- Better Auth's own `openAPI` plugin: documents every generated route with no drift, but opens an additional public `/api/auth/open-api/generate-schema` endpoint and documents routes that are inert until email verification exists (#11).
