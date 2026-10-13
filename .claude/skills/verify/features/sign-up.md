# Sign up

A visitor creates an account at `/signup` with name, e-mail and password, accepting the terms, and lands signed in on `/projects`. Self-signup is scaffolding (ADR 0011): it exists only while `ALLOW_SELF_SIGNUP` and `VITE_ALLOW_SELF_SIGNUP` are on, which the verify instance always sets.

## Sub-features

- `signup-create` creates the account and a session, and lands on `/projects`.
- `signup-terms` refuses to submit until the terms checkbox is ticked.
- `signup-weak-password` rejects a password that fails the policy (ADR 0052).
- `signup-empty-projects` shows a new user, who belongs to no project yet, an empty project list.

## How to get to it (user POV)

- Open `/signup` directly. Nothing links to it: `/login` says `Não tem conta? O acesso é por convite da sua construtora.`

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run with `--as none`. Use a fresh e-mail per run, e.g. `` `signup-${crypto.randomUUID()}@e2e.test` ``.

- **Open.** `await page.goto("/signup")`. The fields `Nome completo`, `E-mail` and `Senha` are visible.
- **Fill.** `page.getByLabel("Nome completo").fill("Bruno Teste")`, `page.getByLabel("E-mail").fill(email)`, `page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo")`.
- **Terms.** `page.getByRole("checkbox", { name: "Aceito os termos de uso e a política de privacidade" }).click()`.
- **Submit.** `page.getByRole("button", { name: "Criar conta" }).click()`. The URL becomes `/projects`.
- **Proof.** The `better-auth.session_token` cookie is httpOnly; `/api/auth/get-session` returns `user.email === email`; `query('SELECT name FROM "user" WHERE email = $1', [email])` returns `Bruno Teste`.

## Gotchas

- The breach check (HIBP) is off on the verify instance, so a pwned but policy-valid password is accepted here and refused in dev or production.
- Sign-up shares the 5-per-minute-per-IP limit with sign-in.
- An e-mail already used answers an error; reuse across runs only works after `down` and `up` reseed.
