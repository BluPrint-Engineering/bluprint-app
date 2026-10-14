# Account menu and sign out

The header of every signed-in screen has an account button named after the user. It opens a menu with the user's e-mail, a light/dark theme choice and `Sair`, which ends the session and returns to `/login`.

## Sub-features

- `account-menu-open` opens the menu, showing the signed-in e-mail.
- `account-theme` switches between `Tema claro` and `Tema escuro`.
- `account-sign-out` ends the session server-side and lands on `/login`.

## How to get to it (user POV)

- On any signed-in screen, the account button in the header, named `Conta de <name>`.
- On `/login` and `/signup`, the theme alone is switched by a button named `Usar tema escuro` or `Usar tema claro`.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run with `--as manager` (Carla Mendes) to match `apps/e2e/tests/sign-out.spec.ts`, or `--as admin` with `Ana Ribeiro`.

- **Open.** `page.getByRole("button", { name: \`Conta de ${accounts.MANAGER_NAME}\` }).click()`. `page.getByRole("menu")` contains `accounts.MANAGER_EMAIL`.
- **Theme.** `page.getByRole("radio", { name: "Tema escuro" }).click()`, in the menu's `radiogroup` named `Tema`. The page switches to the dark palette; `shot` before and after.
- **Sign out.** `page.getByRole("menuitem", { name: "Sair" }).click()`. The URL becomes `/login` and `page.getByLabel("E-mail")` is visible.
- **Proof.** `await (await page.request.get("/api/auth/get-session")).json()` is `null`.

## Gotchas

- A manager sees no `Gerente:` filter in the toolbar; that is the role, not a missing feature.
- The palette fades between themes: a `shot` taken right after the click shows washed-out colours. Wait about a second (`await page.waitForTimeout(1000)`) before capturing a theme change.
- The theme is kept in the browser, so it does not carry across `drive.ts` runs, each of which starts with a fresh context.
