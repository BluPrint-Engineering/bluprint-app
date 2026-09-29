# Remote db:seed is allowed behind a named host and its own password

`db:seed` truncates the database and signs up the fixture accounts. Until now it refused any host but a local one, so production could only be filled by hand. The maintainer needs to fill it, and to reset it before real use, with the same fixture the team develops against. `resolveSeedTarget` in `apps/api/src/db/seed/seed-target.ts` decides from `DATABASE_URL` and the environment, before anything connects:

- **A local host** (`localhost`, `127.0.0.1`, `[::1]`) seeds as before, with the public fixture password and no new variable.
- **Any other host** needs `SEED_ALLOW_HOST` equal to the `DATABASE_URL` hostname, and a `SEED_PASSWORD` that the password policy accepts for every fixture account ([0052](0052-password-policy.md)). Each missing or mismatched variable fails with its own message. Every fixture account gets `SEED_PASSWORD`, and the final summary lists each account with its roles, never the password.

## Consequences

- Naming the host is the guard against a mistyped or leftover `DATABASE_URL`: a variable that merely says "remote is fine" would let the same slip truncate the wrong database.
- The password policy runs up front because the `TRUNCATE` is not in a transaction with the sign-ups. A weak password that sign-up refused after the truncate would leave the target database empty.
- The HIBP lookup stays off, remote included ([0052](0052-password-policy.md)), so the maintainer must not reuse a leaked password. A lookup that failed halfway would leave the same empty database.
- An IPv6 loopback URL now counts as local. The old check compared against `::1`, which `URL.hostname` never returns.

## Considered Options

- **A separate production seed script**: rejected. Two fixtures drift apart, and production would stop matching what the team tests against.
- **A boolean such as `SEED_ALLOW_REMOTE=true`**: rejected, because it passes whatever host the URL happens to name.
