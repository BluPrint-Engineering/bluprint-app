# Better Auth's tables are generated and stay as generated

`user`, `session`, `account` and `verification` are never written by hand: `bun run --filter @bluprint/api auth:generate` rewrites `src/auth/auth.entity.ts` from `auth.config.ts`, and the migration comes from `drizzle-kit` like every other. They carry no decision of ours, so they stay exactly as the CLI generates them, even where our tables differ.

## Consequences

- Foreign keys to `user.id` are `text`, while our ids are `uuid`; Better Auth's tables use `timestamp` without time zone, ours use `timestamptz`.
- The password lives in `account.password`, not in `user`.
- `is_platform_admin` is an additional user field with `input: false`. That, not code review, is what stops anyone from making themselves platform admin through the sign-up payload, which protects the rule that the platform admin never sees project content. The column is `NOT NULL` on purpose: a nullable privilege flag adds a third case to every check that reads it.
