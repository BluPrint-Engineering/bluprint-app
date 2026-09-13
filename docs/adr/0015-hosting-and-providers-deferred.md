# Hosting and providers are deferred until the first deploy

Four choices stay open: **API host, web host, Postgres provider and object storage provider**. Every criterion that decides a host (real cost, request volume, instance size, how much cold start actually hurts) can only be measured with the application running, and none of it exists yet. The choice happens at the first deploy, with measured usage instead of estimates. Until then the code talks to a generic S3-compatible object storage.

## Consequences

- Deferring costs almost nothing: changing host is the same `Dockerfile` with another deploy config; changing Postgres provider is `pg_dump`/`pg_restore` and a new `DATABASE_URL`; storage is an S3-compatible API on both sides. What would be expensive is a proprietary backend, which is why those are rejected below rather than left open.
- Already closed: the web app and the API share one registrable domain ([0009](0009-single-origin-api-prefix-and-proxy.md)), and the API needs a long-lived process ([0016](0016-api-is-a-long-lived-process.md)).
- In development, Postgres runs in a local container; there is no local object storage yet. No cloud account is needed to run the project, so development costs **zero**. Production cost is not estimable until providers are chosen: the survey below ranges from ~US$ 3/month (Fly.io with a free-tier database) to ~US$ 81/month (Cloud Run without cold start plus Cloud SQL). The older estimate of "zero on free tier, US$ 25–45/month beyond it" no longer holds: in 2026 no host with a Brazilian region offers a free tier for a long-lived process.

## Considered Options

Survey of 04/09/2026, recorded so it is not redone. **Treat it as a snapshot**: prices and free tiers change fast. Criteria: a region in Brazil, a long-lived process without cold start, and a free tier that does not expire.

| Candidate | BR region | State in 09/2026 |
| --- | --- | --- |
| Fly.io | ✅ GRU | No free tier since 10/2024. `shared-cpu-1x` 512 MB ≈ US$ 3.32/month, the cheapest option without cold start |
| Cloud Run | ✅ `southamerica-east1` | Always Free only in `us-central1`/`us-east1`/`us-west1`. Scale-to-zero costs cents but cold starts take 1–3 s; `min-instances=1` in São Paulo ≈ US$ 69/month |
| AWS Lightsail | ✅ since 06/2026 | US$ 5/month flat, 2 TB transfer included. You operate the OS |
| AWS EC2 | ✅ `sa-east-1` | Billed per **hour running**, not per use. `t3.micro` in São Paulo ≈ US$ 11–12/month |
| Render | ❌ | No South American region. Free sleeps after 15 min with 30–60 s cold start; always-on US$ 7/month |
| Railway | ❌ | US West/East, Amsterdam and Singapore only. No free tier; Hobby has a US$ 5/month floor |
| Vercel | ✅ `gru1` | Hobby **forbids commercial use**, the same reason it lost the web host |
| Northflank | ❌ | Best free tier on the market (no cold start), but no Brazilian region |
| Koyeb | ❌ | Frankfurt/Washington. Free scales to zero after 1 h and cannot be turned off |
| Azure App Service F1 | Brazil South | 60 CPU minutes/day, sleeps after 20 min, not supported for production |
| AWS App Runner | ❌ | Closed to new customers on 30/04/2026 |
| Oracle Always Free | ✅ `sa-saopaulo-1` | Raw VPS with idle reclaim; ARM capacity in São Paulo is usually unavailable |

**Free tiers that expire.** AWS's 12-month free tier ended for accounts created after 15/07/2025; it became US$ 100–200 of credit for 6 months, and the account **closes itself** at the end. Google Cloud's US$ 300 is a **90-day** trial credit, not a free tier: at the end the billing account closes and resources stop. An expiring free tier is the same failure mode that already removed Render, Railway and Supabase from the database choice: the problem was never performance, it was what happens when the deadline passes.

**Rejected by architecture, not price: Firebase.** Its compute is Cloud Run underneath, requires the Blaze plan with a card, and its free quotas do not reach São Paulo. SQL Connect (formerly Data Connect) is GraphQL with a generated SDK for the **client to talk to the database directly**: used as designed, it removes `apps/api`, Better Auth and the shared Zod spine, and per-project roles would become GraphQL security rules. Keeping NestJS in front, it adds nothing and leaves only the Cloud SQL bill, which has **no free tier on any plan** (≈ US$ 8–12/month). Firestore would also fight the relational organization → project → location → plan → pin model.

**Favorites when this reopens.** Not decisions, but nothing above invalidated the criteria that picked them:

- **Neon** (database): the only one with a São Paulo region, free branching per PR, and hibernation that **does not delete data**. The rejected ones failed on data loss: Render deletes the free database after 30 days, Railway deletes the volume, Supabase pauses after 7 idle days (manual restore), CockroachDB deletes after 6 months.
- **Cloudflare R2** (object storage): the only object storage with free, unlimited egress, which is what makes photo cost predictable. S3 and Supabase charge US$ 0.09–0.15/GB egress, and S3's São Paulo region is ~67% more expensive.
- **Cloudflare Pages** (web): unlimited bandwidth and seats on free. Vercel Hobby forbids commercial use; Netlify gives one seat.
