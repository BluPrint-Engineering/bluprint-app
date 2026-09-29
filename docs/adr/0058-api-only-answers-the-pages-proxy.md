# The API only answers the Pages proxy, and reads the client IP from it

Better Auth's rate limit is keyed on the client IP, and behind a proxy it has none to read: every attempt lands in one bucket per path, so one person retrying a password locks everyone out of login ([0010](0010-self-hosted-better-auth.md)). Reading the IP from a header fixes that only if no client can set the header itself. The proxy is the one [0009](0009-single-origin-api-prefix-and-proxy.md) calls for: a Cloudflare Pages Function in front of the API, so the browser sees one origin.

- **A shared secret gates the API.** With `PROXY_SECRET` set, a middleware registered in `configureApp` before anything that answers (Better Auth's `/api/auth/*`, Nest routes, the docs) compares `X-Proxy-Secret` in constant time and answers 403 `PROXY_REQUIRED` problem details otherwise ([0047](0047-errors-are-rfc-9457-problem-details.md)). It is optional so dev, tests and e2e are unchanged, and required by `envSchema` when `NODE_ENV=production`, so a forgotten variable stops the boot instead of opening the door.
- **The Pages Function is the only holder of the secret.** It strips `X-Proxy-Secret` and `X-Client-IP` from the client's request, then sets them from its own env and from `CF-Connecting-IP`.
- **The IP travels in `X-Client-IP`, not `x-forwarded-for`.** Fly's proxy appends the Cloudflare IP to `x-forwarded-for`, which would make the first entry depend on the order each hop writes it.
- **Better Auth trusts `X-Client-IP` only when the gate is on.** No request reaches Better Auth without passing the gate, so the header can only have come from the function. Without the gate a client could forge it and the limit would vanish, which is why `auth.module.ts` sets the option only when `PROXY_SECRET` is set, and `app.ts` registers the gate on the same condition; the two must not diverge.
- **`GET /api/health` is the one exemption.** The host's health check cannot send the secret without it being written in the host's deploy config (`fly.toml` on Fly), which lives in a public repository, and the route is already anonymous and exposes only status. This corrects the plan in #21, which had the health check sending the header. Any other method or path under `/api/health` is gated.

## Consequences

- **Reaching the API directly is a 403**, in production and in any environment where `PROXY_SECRET` is set. Tools that call it without going through the function (curl, a Swagger UI on the API's own origin) must send the header.
- **The secret is rotated in two places** (the API host and the Pages env), and a mismatch makes the whole app answer 403 until both agree.
- **Dev keeps the old behaviour**: without the gate, Better Auth falls back to `127.0.0.1` in development and tests.

## Considered Options

- **`trustedProxies` on `x-forwarded-for`**: needs to know the proxy addresses, and Cloudflare's ranges change.
- **Network-level restriction (Fly private networking, Cloudflare Access)**: ties the API to one provider's plumbing; a secret header moves with the code.
- **Sending the secret from the health check**: puts it in `fly.toml`.
