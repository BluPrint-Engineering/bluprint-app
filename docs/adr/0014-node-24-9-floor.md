# Node 24.9+ is the API's floor

`apps/api` requires Node 24.9+, in its `engines` and in CI. Better Auth and its Nest package publish ESM only; the API compiles to CommonJS and reaches them through `require(esm)`, available since Node 22.12. The higher floor comes from **Jest**: it only does `require(esm)` through `vm.SourceTextModule`, which needs Node 24.9 and `--experimental-vm-modules`, hence the `NODE_OPTIONS` in `apps/api`'s test scripts.

## Considered Options

- Transpiling `node_modules` through `transformIgnorePatterns`: slower, and hides the problem instead of solving it.
