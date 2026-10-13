# Sign in

A person with an account signs in with e-mail and password at `/login` and lands on their projects; a protected page opened while signed out sends them to the login and back. The session is an httpOnly Better Auth cookie that survives a reload.

## Sub-features

- `auth-login` signs in through the form and lands on `/projects` with a real session.
- `auth-login-wrong-password` keeps the user on `/login` with an inline error.
- `auth-redirect` sends a signed-out visit to a protected route to `/login?redirect=…`, and back there after signing in.
- `auth-already-signed-in` skips the login screen for a user with a session, and keeps the session on reload.
- `auth-rate-limit` refuses a sixth attempt within a minute with a pt-BR message.

## How to get to it (user POV)

- Open the app at `/` or any protected route while signed out.
- Open `/login` directly.
- From `/signup`, the `Entrar` link.

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

## Gotchas

- `getByLabel("Senha")` without `{ exact: true }` also matches the show-password toggle.
- Sign-in allows 5 attempts per minute per IP, failed ones included: the full journey spends 2 per device. Past the limit the screen shows `Muitas tentativas seguidas. Aguarde um minuto e tente de novo.`, which is `auth-rate-limit` working, not a broken login.
- `--as admin|manager` signs in before the journey and spends one attempt per device too.
