# Self-signup is scaffolding behind a flag

In the finished product nobody signs up alone: the platform admin creates the organization by hand after payment, and accounts are born from invitations. Self-signup exists today as deliberate scaffolding to unblock epic #1, and it leaves in #11/#12. `ALLOW_SELF_SIGNUP` in `envSchema` is a `z.stringbool()` that **defaults to `false`**, so a host that never declares it does not open the door by accident. Off, `POST /api/auth/sign-up/email` answers **403** `SELF_SIGNUP_DISABLED` and only sign-up is closed: sign-in, session and sign-out keep working, which is what makes the flag safe to flip on an environment with people logged in.

## Consequences

- The 403 comes from a `hooks.before` in `auth.ts`. That route now has two unrelated 403s: this one and the `trustedOrigins` ones; only the body's `code` tells them apart.
- The flag is read at boot: changing `.env` requires restarting the API.
- CI sets `ALLOW_SELF_SIGNUP: "true"` (quoted: unquoted YAML yields a boolean, which `z.stringbool()` rejects), because every auth integration test creates an account.

## Considered Options

- `emailAndPassword.disableSignUp`: answers 400. `disabledPaths`: answers 404.
