# Sign-up seeding is a compensated saga, not one transaction

Its seed is restated in units by [0074](0074-a-license-is-units-and-each-project-reserves-its-own.md); the decision stands.

The sign-up request also creates that person's organization, an `admin` membership and **one license of 500 units**. The seeding runs on the server in the same request, not as a second client call: a network drop between two calls would leave an orphan user, and the server is the one that decides who is admin of what. The epic planned to seed inside the transaction that creates the user, but Better Auth does not allow it: every `create.after` hook is queued by `queueAfterTransactionHook` and drained **after** commit, without the transaction. What it guarantees is that the queue drains **before** the response exists. So the three tables are created in a transaction of ours and, if it fails, the new user is deleted (`session` and `account` cascade) and the error is rethrown: a 500 with no session cookie. From outside it is indistinguishable from a single transaction.

## Consequences

- `SignupProvisioning` in `auth/signup/signup-provisioning.ts` only orchestrates. Its `@Transactional()` method writes through the repositories of the features that own the tables (`organizations`, `members`, `licenses`); on failure its entry point deletes the user through `auth/users.repository.ts`, outside that transaction, because `user` belongs to Better Auth ([0051](0051-transaction-aware-repositories-via-cls.md)).
- The hook must throw a plain `Error`, never an `APIError`: only a plain `Error` reaches the 500 with no headers, which guarantees no `Set-Cookie` on a failed sign-up.
- **Accepted residue:** if Postgres becomes unreachable between the user commit and the `DELETE`, an orphan remains. It is an infrastructure failure, and the alternative meant wiring coupled to undocumented library internals.
- What is scaffolding is **who** creates the licenses; the contracted units are real, because free units decide whether a project can be created.
- **For #11:** the hook seeds on **every** user creation. An invited person joins an organization that already exists, so this hook must change together with the flag in [0011](0011-self-signup-is-scaffolding.md).
