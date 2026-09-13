# Self-hosted Better Auth, mounted in Nest by a community package

Authentication is Better Auth running inside the API with the Drizzle adapter, mounted in NestJS by `@thallesp/nestjs-better-auth`, the package Better Auth's own documentation points to, since there is no first-party Nest adapter. What decided it was self-hosting: accounts, sessions and passwords stay in our Postgres, with no external provider in the login path and no cloud account needed to develop. Per-project permissions live in our database either way.

`src/auth/auth.ts` builds the instance from the injected Drizzle database, `src/auth/auth.module.ts` hands it to the Nest package through `forRootAsync`, and `auth.config.ts` at the workspace root is what the Better Auth CLI reads to generate the schema (same place and reason as `drizzle.config.ts`).

The session travels as an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production), valid for **90 days and renewed after each day of use**, so people in the field are not asked to log in on every visit.

## Consequences

- The client never sends `rememberMe: false`: it would turn the cookie into a browser-session cookie and kill persistence regardless of the expiry.
- The mount imposes four things that break at runtime if removed; they are listed in `.claude/rules/api.md` (`bodyParser: false`, the global `AuthGuard` with `@AllowAnonymous()` as the only opt-out, `disableTrustedOriginsCors: true`, and auth routes bypassing Nest's filter and pipe, so the web client translates two error formats).
- `trustedOrigins` only checks requests that **carry a cookie** (the shape of a CSRF attack), so a new client's first call seems to pass and later ones fail. With a cookie, a foreign `Origin` gets 403 `INVALID_ORIGIN`, and `Origin: null` (a sandboxed iframe, or Bruno with no header set) gets 403 `MISSING_OR_NULL_ORIGIN`. That is why the Bruno auth requests send `Origin: {{webOrigin}}` explicitly.
- **Known hole in the rate limit, closed in #21.** Better Auth resolves the client IP from a header (`x-forwarded-for` by default) and falls back to `127.0.0.1` in development and tests. In production, with no reverse proxy configured, it resolves no IP and every attempt lands in one bucket per path: the limit still holds, but globally, so one person retrying a password in a loop locks everyone out of login for a minute. The fix (`advanced.ipAddress.ipAddressHeaders` + `advanced.ipAddress.trustedProxies`) needs to know which proxy sits in front of the API. Trusting the header without `trustedProxies` would be worse than today: an attacker changes the value per request and the limit disappears.
- **Email verification and password reset are out by decision** until a transactional email provider exists; the first email the product really needs is the invitation (#11). Sign-up already returns a session, and the verification and reset routes exist but are inert. Without verification, email-enumeration protection is inactive: the API answers differently for an already registered email. Low impact for a product whose accounts are invited employees, and it closes in #11.

## Considered Options

- Auth0, Clerk, Supabase Auth: hosted, so the project could no longer run fully offline.
