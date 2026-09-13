# Every route declares its response with a DTO

Every controller method declares what it returns with a DTO built by `createZodDto()` over the output schema and applied with `@ZodResponse()`, which wraps `@ZodSerializerDto()` and also documents the response in OpenAPI ([0046](0046-openapi-via-nestjs-swagger.md)). The global `ZodSerializerInterceptor`, registered once in `app.ts`, validates the handler's return value against that schema before it becomes JSON and strips every field the schema does not declare. This is what keeps one organization's data from reaching another when a query over-selects: a TypeScript return type only holds at compile time, and a response outside the contract becomes a 500 instead of a leak.

## Consequences

- A route with no input (`GET /api/projects`) has no request DTO, but still has a response DTO.
- A `z.iso.datetime()` field needs the service to return a string; a `Date` fails validation with a 500, because the interceptor runs before serialization.
