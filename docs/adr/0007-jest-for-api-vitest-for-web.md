# Jest in the API, Vitest in the web app

Jest is the runner Nest assumes: `@nestjs/testing` + Supertest is the documented path, and `ts-jest` reads the same `tsconfig` as the build, so decorators and `emitDecoratorMetadata` behave the same in tests and in production. A divergence there does not produce a red test; it produces `Nest can't resolve dependencies` at runtime. Vitest stays in the web app, where DOM and JSX matter.

## Consequences

- Jest's ESM support sets the API's Node floor (see [0014](0014-node-24-9-floor.md)).
