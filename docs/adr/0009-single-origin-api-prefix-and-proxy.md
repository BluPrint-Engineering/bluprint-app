# One origin: the API under `/api`, reached through a proxy

The API mounts everything under the global prefix `api` (`configureApp` in `app.ts`) and the web client calls **relative** paths: `apiFetch` prefixes `/api`, and there is no environment variable holding the API URL. In development, Vite proxies `/api` to the API port (`vite.config.ts` reads `PORT` from the root `.env`). The browser sees a single origin, so the session cookie is first-party: no CORS with credentials, and no `SameSite=None`, which Safari handles through ITP with the symptom of users silently appearing logged out, on the customer's phone and not ours.

## Consequences

- In production the web app and the API must share the same registrable domain. Free subdomains from different providers (`*.pages.dev` + `*.fly.dev`) are different domains and break the cookie, so owning a domain is a requirement of the first deploy.
- The path in the API, in the Bruno collection and in integration tests includes the prefix (`/api/health`); the path passed to `apiFetch` does not (`/health`).

## Considered Options

- A token in `localStorage`: works across domains, but any XSS would exfiltrate a credential valid for 90 days.
