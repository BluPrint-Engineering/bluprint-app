# One origin: the API under `/api`, reached through a proxy

The API mounts everything under the global prefix `api` (`configureApp` in `app.ts`) and the web client calls **relative** paths: `apiFetch` prefixes `/api`, and there is no environment variable holding the API URL. In development, Vite proxies `/api` to the API port (`vite.config.ts` reads `PORT` from the root `.env`). The browser sees a single origin, so the session cookie is first-party: no CORS with credentials, and no `SameSite=None`, which Safari handles through ITP with the symptom of users silently appearing logged out, on the customer's phone and not ours.

## Consequences

- In production the browser must see one origin. A Cloudflare Pages Function proxying `/api/*` gives that on `*.pages.dev` alone, with the API on `*.fly.dev` reached server-side, so owning a domain is not a requirement ([0059](0059-first-deploy-neon-fly-pages.md)).
- The path in the API, in the OpenAPI document and in integration tests includes the prefix (`/api/health`); the path passed to `apiFetch` does not (`/health`).

## Considered Options

- A token in `localStorage`: works across domains, but any XSS would exfiltrate a credential valid for 90 days.
