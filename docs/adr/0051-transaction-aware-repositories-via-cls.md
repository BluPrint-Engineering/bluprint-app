# Repositories are injectable and read the transaction from CLS

Supersedes [0005](0005-queries-take-the-executor.md).

Each table's database access lives in an `@Injectable()` repository class, `<feature>.repository.ts`, and services receive repositories by dependency injection. That is the NestJS feature-module shape a contributor expects, and it puts a service's dependencies in its constructor. [0005](0005-queries-take-the-executor.md) rejected repository classes for a real hazard: a repository holding an injected database handle runs **outside** a transaction the service opened, so a `throw` rolls the transaction back but leaves the repository's writes in place, with no error and a clean typecheck.

The hazard is removed, not accepted. `@nestjs-cls/transactional` with `@nestjs-cls/transactional-adapter-drizzle-orm` keeps the current transaction in continuation-local storage (CLS). A repository never holds the database: it injects `TransactionHost<DatabaseAdapter>` and runs every query on `txHost.tx`, which is the ambient transaction when one is open and the plain Drizzle instance otherwise. A service marks a method `@Transactional()`, and every repository call inside it joins that one transaction, with no executor threaded by hand.

## Consequences

- `ClsModule` is registered globally in `app.module.ts`, with its middleware mounted and the transactional plugin over the `DATABASE` token. A `@Transactional()` method opens its own CLS context when none is active, so it also works outside an HTTP request.
- **The rollback guarantee rests on `@Transactional()`**, which the typecheck cannot see. `create-project.int-spec.ts` fails without it ("without a free license, answers 409 and creates nothing"); a new multi-write service method needs an int-spec that fails the same way.
- A repository fetches, writes and returns; it never decides. `ForbiddenException` and `NO_FREE_LICENSE` stay in the service. Concurrency and integrity guarantees (`FOR UPDATE SKIP LOCKED`, the organization join that isolates tenants, the membership-or-admin filter) stay in the repository query, because that is the database keeping data sound.
- A feature that needs another feature's table imports that feature's module, which exports its repository: `projects` imports `members` and `licenses`. A table with no route yet still gets a module that only provides and exports its repository.
- Sign-up provisioning is `auth/signup-provisioning.ts`, an injectable class. Better Auth's handler is mounted on the HTTP adapter, possibly outside the CLS middleware, so its entry point runs under `@UseCls()`; see [0012](0012-signup-seeding-as-compensated-saga.md) for the saga itself. `createAuth` receives it as an `onUserCreated` callback, so Better Auth's configuration never imports it, and `auth.config.ts` passes a no-op.
- `db:seed` boots a Nest application context from `AppModule` and takes Better Auth, the database and the repositories from it, so seeding and the running API share one code path. It runs under Bun, which emits decorator metadata for a type-only import as a value: a type used on a decorated parameter is imported with `type` (`import { Session, type UserSession }`), or the seed fails at load.
- `DatabaseAdapter` is spelled from the base `TransactionalAdapter` interface: under `exactOptionalPropertyTypes`, `TransactionalAdapterDrizzleOrm<Database>` makes `txHost.tx` infer as `never`.

## Considered Options

- **Executor-taking query functions** ([0005](0005-queries-take-the-executor.md)): safe, but every call site threads `tx` by hand and the shape is foreign to a Nest contributor.
- **Repositories holding `DATABASE`, with the service passing `tx` into each method**: the same threading as 0005, with DI ceremony on top.
- **`AsyncLocalStorage` wired by hand**: the same mechanism without propagation modes, nesting or tested adapters.
