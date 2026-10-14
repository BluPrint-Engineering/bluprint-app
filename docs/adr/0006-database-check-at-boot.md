# The API checks the database at boot

`DatabaseModule` runs `SELECT 1` before the port opens. A `DATABASE_URL` that does not answer is a configuration error, caught at the same moment `envSchema.parse` catches the rest. The check lives in code rather than in Compose `depends_on`: Compose only orders containers, the API runs on the host in development, and even in a container it only proves Postgres accepts connections, not that the URL is right.

## Consequences

- A database that goes down **after** boot is not covered; that is what the `database` / `status: "degraded"` field of `/health` reports.
- In production a database blip becomes a crash loop. The mitigation is the restart policy in `fly.toml` (`[[restart]]`, `policy = "on-failure"`, `retries = 10`), so the machine stops restarting after ten failed boots instead of looping forever.
