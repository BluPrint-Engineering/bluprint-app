# Sign in

A person with an account signs in with e-mail and password at `/login` and lands on their projects; a protected page opened while signed out sends them to the login and back. The session is an httpOnly Better Auth cookie that survives a reload. A save with fields that meets an expired session is kept, and after the same account signs in again the same entry reopens its form filled.

## Sub-features

- `auth-login` signs in through the form and lands on `/projects` with a real session.
- `auth-login-wrong-password` keeps the user on `/login` with an inline error.
- `auth-redirect` sends a signed-out visit to a protected route to `/login?redirect=…`, and back there after signing in.
- `auth-already-signed-in` skips the login screen for a user with a session, and keeps the session on reload.
- `auth-rate-limit` refuses a sixth attempt within a minute with a pt-BR message.
- `auth-expired-restore` keeps a save with fields that meets an expired session: after signing in again as the same account the screen reopens the form by the entry that sent it, with the typed value and every other form closed, and nothing is sent again. `Cancelar` closes it, returns focus to that entry and forgets it, so a reload opens nothing. Actions without fields (remove, move, deliver) never come back. Every entry and screen is a row of `apps/web/src/routes/_authenticated/sessionRestore.test.tsx` (ADR 0089).

## How to get to it (user POV)

- Open the app at `/` or any protected route while signed out.
- Open `/login` directly.
- From `/signup`, the `Entrar` link.
- Any save while the session is gone: the app sends the person to `/login?redirect=<the screen>`.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run with `--as none`; the journey starts signed out.

- **Full journey.** `bun .claude/skills/verify/scripts/drive.ts .claude/skills/verify/journeys/login.ts --as none` proves `auth-redirect`, `auth-login-wrong-password` and `auth-login` on both devices, including one new `session` row for Ana per device.
- **Redirect.** `await page.goto("/projects")`. The URL becomes `/login?redirect=%2Fprojects` and `page.getByLabel("E-mail")` is visible.
- **Wrong password.** Fill `page.getByLabel("E-mail")` with `accounts.ADMIN_EMAIL`, `page.getByLabel("Senha", { exact: true })` with anything else, click `page.getByRole("button", { name: "Entrar" })`. The text `E-mail ou senha incorretos.` appears and the URL stays on `/login`.
- **Sign in.** Same fields with `accounts.SEED_PASSWORD`. The URL becomes `/projects` and `page.getByRole("list", { name: "Obras" }).getByRole("listitem")` has 12 items.
- **Session proof.** `(await context.cookies()).find((c) => c.name === "better-auth.session_token")?.httpOnly` is `true`; `await (await page.request.get("/api/auth/get-session")).json()` has `user.email` equal to the signed-in e-mail; `query('SELECT count(*)::int AS n FROM "session" s JOIN "user" u ON u.id = s.user_id WHERE u.email = $1', [email])` grew by one.
- **Already signed in.** With `--as admin`, `await page.goto("/login")`; the URL becomes `/projects`. `await page.reload()` and `/api/auth/get-session` still returns Ana.

- **Expired session on a location page.** `bun .claude/skills/verify/scripts/drive.ts .claude/skills/verify/journeys/session-restore.ts --as admin` proves `auth-expired-restore` on `Residencial Jardins`: `Renomear andar` on Torre B's `10º andar` comes back filled in `Renomear o andar` alone, `Cancelar` focuses `Ações do andar` and a reload opens nothing; `Trocar tipologia` on the `Hall` of Torre A's `3º andar` comes back as `Trocar a tipologia da área comum Hall` with `Corredor` chosen, `Cancelar` focuses `Trocar tipologia`, a reload opens nothing and the `Hall` still follows `Hall padrão`; `Adicionar` > `Torre` on the façade comes back with `Nome da torre` filled and `Cancelar` focuses `Adicionar`. Nothing is saved, so the seed is unchanged.
- **Expire by hand.** `await page.context().clearCookies()` right before the save; the save answers 401 and the URL becomes `/login?redirect=…`.

## Gotchas

- `getByLabel("Senha")` without `{ exact: true }` also matches the show-password toggle.
- Sign-in allows 5 attempts per minute per client IP, failed ones included. `drive.ts` gives every device run its own IP, so each device has its own budget of 5: the full journey spends 2 and `--as admin|manager|assistant` spends 1 more, and other drives in the instance never exhaust it.
- `auth-expired-restore` spends 3 sign-ins of the device's budget of 5 on top of the 1 of `--as admin`.
- A journey that hits `Muitas tentativas seguidas. Aguarde um minuto e tente de novo.` on purpose (`auth-rate-limit`) makes all its attempts on one device; it is the limit working, not a broken login.
