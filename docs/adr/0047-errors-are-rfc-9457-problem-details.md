# Every error is RFC 9457 problem details, with a stable `code`

Every non-2xx response from the API — our routes and Better Auth's alike — is RFC 9457 problem details served as `application/problem+json`: `type`, `title`, `status`, `detail`, `instance`, plus two extension members. `code` is a stable SCREAMING_SNAKE_CASE identifier the client branches and translates on; `errors` lists one `{ pointer, code, detail }` per invalid input, the pointer rooted at where it was sent (`/body/email`, `/query/verbose`). The schema lives in `packages/shared` (`problemDetailsSchema`), so the web app parses the same object the API emits.

The API speaks English only. `title` and `detail` are for a developer reading a response; a screen shows pt-BR text it maps from `code`, never from `detail` ([0009](0009-single-origin-api-prefix-and-proxy.md) keeps both on one origin, so nothing in between rewrites them).

Three places produce the body, all through `problemDetails()` in `apps/api/src/common/problems/`:

- `AllExceptionsFilter`, for everything thrown inside Nest. A `ProblemException` keeps its `code`, `detail` and `errors`; any other `HttpException` answers with its status alone, so a free-text message can never leak internals; anything else is a logged 500.
- `RequestValidationPipe`, which wraps `nestjs-zod`'s pipe and rethrows its failure as `VALIDATION_FAILED` with `errors` — wrapped because the library's exception factory never learns whether the input was the body, the query or a param.
- `withProblemDetails`, which wraps Better Auth's request handler and rewrites its `{ message, code }` bodies, keeping status, headers (`X-Retry-After`) and `code`. It wraps the handler rather than a plugin's `onResponse` because the rate limiter answers 429 before any plugin hook runs.

## Consequences

- A failure the client should act on is `throw new ProblemException({ status, code, detail })` from the service. A new `code` is a contract change, like a new response field: a client may already branch on it.
- `type` is `about:blank` everywhere, so `title` is always the HTTP reason phrase and `code` carries the specific meaning. There is no domain yet to host dereferenceable problem-type URIs ([0015](0015-hosting-and-providers-deferred.md)); switching `type` later adds information without breaking a client that reads `code`.
- `instance` is the request path without its query string, which can carry tokens.
- Validation answers 400 on both sides. Better Auth's own body validation arrives as `VALIDATION_FAILED` too, but with a `detail` and no `errors`: its message is not structured enough to split per field.
- Every error response in the OpenAPI document is problem+json, and `openapi.int-spec.ts` fails one that is not.
- The body's shape is `problemDetailsSchema` in `packages/shared/src/errors/problem-details.ts`, the one definition the API and the web app both read.

## Considered Options

- A homegrown envelope (`{ code, message, details }`): shorter, but no client, gateway or generated SDK recognizes it, and it re-decides what RFC 9457 already settled.
- Leaving Better Auth's `{ message, code }` as is: less code, but every screen would parse two error shapes for the life of the product.
- Localizing `title`/`detail` in the API through `Accept-Language`: RFC 9457 allows it, but user-facing text belongs to the web app, and a translated `detail` is useless in a log.
