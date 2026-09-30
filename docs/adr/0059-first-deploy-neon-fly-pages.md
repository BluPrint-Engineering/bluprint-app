# First deploy: Neon São Paulo, Fly GRU, Cloudflare Pages proxying `/api`

Supersedes [0015](0015-hosting-and-providers-deferred.md).

Production runs on three providers, all under the company email:

- **Database: Neon**, project `bluprint` in AWS São Paulo (`aws-sa-east-1`), reached through its **direct** connection string (pooling off, `sslmode=require`). It is the only candidate in the survey of 04/09/2026 (in 0015) with a São Paulo region, and the only free tier whose hibernation keeps the data.
- **API: Fly.io**, app `bluprint-api` in `gru`, one `shared-cpu-1x` 512 MB machine (≈ US$ 3.32/month), the cheapest long-lived process with a Brazilian region in the same survey. The image is the root `Dockerfile`, the config `fly.toml`.
- **Web: Cloudflare Pages**, project `bluprint` at `https://bluprint.pages.dev`: unlimited bandwidth and seats on free, and its Functions are what proxy `/api/*` to the API ([0058](0058-api-only-answers-the-pages-proxy.md)).
- **Object storage stays open**: nothing stores files yet. Cloudflare R2 is still the favourite, for 0015's reason (free egress), and is chosen with the first upload.

**Deploy is `.github/workflows/deploy.yml`**, fired by `workflow_run` when CI finishes green on a push to `main`; a pull request, or a red CI, never deploys. It checks out the commit CI approved (`head_sha`), not the tip of `main`, and runs in its own `deploy` concurrency group without cancelling, so two deploys never overlap. The API job goes first: `flyctl deploy --remote-only --ha=false` (one machine, not Fly's default two), whose `release_command` applies the migrations and aborts the release if they fail, leaving the previous version up. The web job `needs` it: it builds `shared` and the web app with `VITE_ALLOW_SELF_SIGNUP=false` and runs `wrangler pages deploy` on `dist/` with `--branch main`, which marks it production.

**Secrets live where they are read.** Fly holds `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN` and `PROXY_SECRET`; the Pages Function holds `API_ORIGIN` and the same `PROXY_SECRET`; GitHub holds only what deploys: `FLY_API_TOKEN` (a deploy token scoped to the app), `CLOUDFLARE_API_TOKEN` (Pages edit only) and `CLOUDFLARE_ACCOUNT_ID`. Every one is also in the company password manager, and none reuses a development value.

## Consequences

- **Corrects [0009](0009-single-origin-api-prefix-and-proxy.md): an owned domain is no longer a prerequisite.** The browser only ever talks to `bluprint.pages.dev`; the Pages Function reaches `bluprint-api.fly.dev` server-side, so the session cookie is first-party without a shared registrable domain. `pages.dev` is on the Public Suffix List, so the cookie cannot leak to other Pages projects either. A custom domain becomes a branding choice, not a technical one.
- **Temporary exception to [0016](0016-api-is-a-long-lived-process.md).** `fly.toml` scales the machine to zero (`auto_stop_machines = "stop"`, `min_machines_running = 0`), and Neon's free compute suspends when idle, so the first request after a quiet spell pays both cold starts. Acceptable while only the partners use it; the trigger to undo it is **the first user from outside the company**, and undoing it is `min_machines_running = 1`.
- **The rate-limit hole from [0010](0010-self-hosted-better-auth.md) is closed in production**, not only in code: the gate from 0058 is on because `NODE_ENV=production` requires `PROXY_SECRET`, and `GET /api/health` is the only route that answers without it.
- **Migrations must be backward compatible.** The release command migrates before the new machines start, and the old web app keeps serving until the web job finishes, so for a while old code runs against the new schema. A destructive change ships in two deploys: stop using it, then drop it.
- **The two jobs are not atomic.** If the web job fails after the API one succeeded, production runs the new API behind the previous web app until the next green deploy or a re-run of the failed job.
- **Re-running an old green CI run redeploys its commit**, which is a rollback of the code but not of the schema; the same backward-compatibility rule is what keeps it safe.
- **A queued deploy can be replaced.** GitHub keeps one pending run per concurrency group; a newer push replaces the waiting one, so an intermediate commit may never deploy on its own. Order still holds, since the survivor is always the newest.
- **Accounts are the company's alone.** No partner is invited to Neon, Cloudflare or Fly, by decision; the maintainer manages them.

## Considered Options

- **The providers' own Git integrations** (Pages building on push, Fly's GitHub app): each deploys on its own clock, without waiting for CI and without ordering the web app after the API and its migrations.
- **Neon's pooled connection string**: built for many short-lived clients, while one long-lived API process already holds its own `node-postgres` pool, and Neon recommends the direct connection for schema migrations, which the same `DATABASE_URL` runs.
- **Everything else from the 04/09 survey**: rejected there for no Brazilian region, cold start, commercial-use bans or free tiers that expire; nothing measured since changed the ranking.
