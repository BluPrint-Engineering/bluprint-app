# Database access lives in query functions that take the executor

Each domain's database access lives in `<domain>.queries.ts` as exported functions whose first parameter is the executor (`Executor` in `db/database.module.ts`: a database or a transaction). An injected repository class would hold `this.db` fixed and run **outside** a transaction the service opened, so a `throw` that rolls the transaction back would leave the class's writes in place, with no error and a clean typecheck. Passing the executor avoids that without DI ceremony.

## Consequences

- The service calls queries; the controller never does. A query fetches, writes and returns; it does not decide (`if (!license) throw new ConflictException()` belongs in the service). Concurrency and integrity guarantees (`FOR UPDATE SKIP LOCKED`, `UNIQUE`, the organization filter in `WHERE`) belong in the query, because that is the database keeping data sound, not a business decision.
- A domain that needs another domain's data imports the queries of the domain that owns the table, never from `common/`.
- `projects/projects.queries.ts` is the worked example; `auth/signup-provisioning.ts` is a transaction calling queries from three domains.

## Considered Options

- `@Injectable()` repository classes: rejected for the transaction leak above.
