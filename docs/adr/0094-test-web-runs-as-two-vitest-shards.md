# `test-web` runs as two Vitest shards

Amends [0091](0091-test-splits-into-test-api-and-test-web.md): `test-web` is one matrix job with two shards; the rest stands.

`test-web` was the slowest job of the workflow (307 to 308 s) and the critical path of every run. `.github/workflows/ci.yml` now runs it as `shard: [1, 2]` with `fail-fast: false`, each shard building `@bluprint/shared` and calling `bun run --filter @bluprint/web test --shard=<n>/2`. The jobs show as `test-web (1/2)` and `test-web (2/2)`. The fan-in `ci` is unchanged: `needs: [static, test-api, test-web, e2e]` sees the matrix as one result, which is not `success` when any shard failed, was cancelled or was skipped.

## Consequences

- **The slowest web job drops to about 196 to 224 s** at about two to three more job-minutes per run, measured on the real runner.
- **The shards are not balanced**: Vitest splits by file count, not duration, so one shard is consistently slower, and a new slow file can shift the split.
- **`test-web` no longer calls the root `test:web` script**: the shard flag must reach Vitest, so the job runs the workspace script directly, still building `@bluprint/shared` first.

## Considered Options

- **Three shards**: 15 to 43 s faster than two, very unbalanced, more runner time.
- **Sharding `e2e`**: the web suite stays the bottleneck, so the workflow gets no faster.
