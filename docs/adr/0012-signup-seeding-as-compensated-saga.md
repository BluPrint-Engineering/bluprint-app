# Sign-up seeding is a compensated saga, not one transaction

The sign-up request also creates that person's organization, an `admin` membership and **three free licenses**. The seeding runs on the server in the same request, not as a second client call: a network drop between two calls would leave an orphan user, and the server is the one that decides who is admin of what. The epic planned to seed inside the transaction that creates the user, but Better Auth does not allow it: every `create.after` hook is queued by `queueAfterTransactionHook` and drained **after** commit, without the transaction. What it guarantees is that the queue drains **before** the response exists. So the three tables are created in a transaction of ours and, if it fails, the new user is deleted (`session` and `account` cascade) and the error is rethrown: a 500 with no session cookie. From outside it is indistinguishable from a single transaction.

## Consequences

- `auth/signup-provisioning.ts` only orchestrates. Each write is a query of the domain that owns the table (`organizations`, `members`, `licenses`), and deleting the user is `auth/auth.queries.ts`, because `user` belongs to Better Auth.
- The hook must throw a plain `Error`, never an `APIError`: only a plain `Error` reaches the 500 with no headers, which guarantees no `Set-Cookie` on a failed sign-up.
- **Accepted residue:** if Postgres becomes unreachable between the user commit and the `DELETE`, an orphan remains. It is an infrastructure failure, and the alternative meant wiring coupled to undocumented library internals.
- What is scaffolding is **who** creates the licenses; the license itself is real, because "is there a free license?" decides whether a project can be created.
- **For #11:** the hook seeds on **every** user creation. An invited person joins an organization that already exists, so this hook must change together with the flag in [0011](0011-self-signup-is-scaffolding.md).
