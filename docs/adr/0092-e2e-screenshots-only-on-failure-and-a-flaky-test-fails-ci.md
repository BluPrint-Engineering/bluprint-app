# E2E keeps screenshots for failures only, and a flaky test fails CI

Amends [0050](0050-playwright-for-end-to-end.md), which published the E2E screenshots as the review evidence of a pull request; that role moved to the `verify` skill in [0075](0075-pr-captures-from-the-verify-skill.md).

`apps/e2e/playwright.config.ts` changes two settings:

- `screenshot: { mode: "only-on-failure", fullPage: true }`, where it was `"on"`: nothing consumes a screenshot of a passing test.
- `failOnFlakyTests: !!process.env.CI`: a test that fails and then passes on retry is flaky, and the run exits with an error.

## Consequences

- **Retries stay at 2 on CI.** A failure is still classified `flaky` or `failed`. `trace: "on-first-retry"` records the first retry, and the failed first attempt keeps its screenshot and its video, so a flake arrives with evidence of both attempts.
- **A flake is a red `ci`**, and on `main` a held deploy ([0090](0090-ci-runs-every-job-on-a-push-to-main-and-deploy-waits-for-all.md)).
- **Both projects, `video: retain-on-failure` and the `playwright-report` artifact are unchanged.** The artifact now holds screenshots of failures only.
- **Local runs are unchanged**: `retries` is 0 off CI, so `failOnFlakyTests` has nothing to flag.

## Considered Options

- **`retries: 0`**: loses the flaky versus broken classification and the retry trace.
- **Report flakes without failing**: a green check nobody reads.
