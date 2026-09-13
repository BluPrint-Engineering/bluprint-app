# Shared Zod schemas, applied in the API through nestjs-zod

`packages/shared` holds the Zod schemas as the single source of validation. In the API, `createZodDto()` wraps a schema in a DTO class that the global `ZodValidationPipe` reads through decorator metadata, so the web client and the API are validated by the same object.

## Consequences

- A DTO import is a **value** import. `import type` erases the value `design:paramtypes` needs, and dependency injection breaks at runtime, not at compile time. That is why `apps/api` cannot enable `verbatimModuleSyntax` or `isolatedModules`, and why ESLint's `consistent-type-imports` is off on purpose.

## Considered Options

- `class-validator` + `class-transformer`, Nest's native path: duplicates the contract in class decorators and breaks the shared-schema spine.
