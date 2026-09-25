# Password policy follows NIST SP 800-63B: length and a blocklist, no composition rules

A password is 8 to 64 characters, and it is refused when it is easy to guess or has already leaked. **It has no composition rules** (upper case, lower case, symbol). NIST SP 800-63B rev 4 (§3.1.1.2) forbids them, and OWASP agrees. People satisfy them the predictable way: `bluprint123` becomes `Bluprint@123`, which every attack dictionary tries early. The same rules would reject a strong passphrase such as `prumo nivel esquadro`, and they are hard to type one-handed on a phone keyboard inside a site.

"Easy to guess" is `isGuessablePassword` in `packages/shared`. It covers a common password, including one with a letter-free tail such as `senha123` or `Password2024!`, a repeated pattern or a repeated or sequential run with fewer than 4 other characters around it (`12341234`, `abcdefg1`), and a password whose **core** is BluPrint's name or the person's own name or e-mail. Its core means fewer than 4 real letters remain once every occurrence of that word is removed, read through leetspeak and separators: `Silva!2026`, `Silva1357` and `SilvaSilva` are refused for a Silva, `rosa-dos-ventos-azul` passes for a Rosa. Those are the first guesses of a targeted attack, and a person's name is on every report they appear in. The web form runs the same function for instant feedback. The API enforces it in the `hooks.before` of `auth.ts`, on sign-up, change-password and reset-password. On a change it takes the name and e-mail from the session; a reset has none, so there only the context-free checks and the product name apply.

"Already leaked" is Better Auth's `haveIBeenPwned` plugin. Only the first 5 characters of the password's SHA-1 leave the server (k-anonymity), never the password. `PASSWORD_BREACH_CHECK` is a `z.stringbool()` that **defaults to `true`**, so a host that never declares it still checks.

## Consequences

- **The lookup fails closed.** While `api.pwnedpasswords.com` is unreachable, every route that sets a password answers 500 and no account is created. Accepting a password nobody could check would be the silent failure.
- The integration tests, the e2e run and `db:seed` turn the lookup off, so none of them depends on a third-party API being up. `password-policy.int-spec.ts` alone turns it on, against a stubbed `fetch`.
- The blocklist runs before Better Auth's own length check, so `isGuessablePassword` returns false outside 8–64 characters. That password still gets Better Auth's `PASSWORD_TOO_SHORT`/`PASSWORD_TOO_LONG`, and an unauthenticated 100 KB password never reaches the scan, which is quadratic.
- **8 characters is the floor NIST accepts only with multi-factor authentication.** Password-only, it asks for 15. BluPrint has no MFA yet; the minimum stays at 8 for typing on a phone, and MFA is owed (#88).
- The seed password is `canteiro-de-obras-azul`: `bluprint123` no longer passes.

## Considered Options

- **Composition rules**: rejected for the reasons above.
- **Minimum of 15**: the NIST figure for password-only accounts. Rejected for now, in exchange for MFA.
- **A large common-password file (e.g. the top 100k) instead of HIBP**: works offline, but adds hundreds of kilobytes to the web bundle or runs server-side only, and it misses what leaked after it was cut. HIBP covers both.
