# Project configuration, rename and reservation

From a project's home, `Configuração da obra` opens `/projects/<id>/configuration`: the header keeps the project's name and status, the back link reads `Início da obra`, and a single card, `Dados da obra`, holds the project's name and its units row (`Usa 70 de 120 reservadas`). The admin and the project's manager rename it in place with `Renomear`; the new name shows in the header and in the list without a reload. An assistant, and everyone on a delivered project, reads the name with a lock line saying why it cannot change. Every role reads the reservation; only the admin changes it, in the `Alterar reserva` dialog (a centered dialog on the desktop, a sheet on the phone), and a delivered project shows `Usou N unidades.` with no action.

## Sub-features

- `config-entry` shows `Configuração da obra` in the header of the project home: a button with text on the desktop, a 44px icon button with the same accessible name on the phone. Every role sees it.
- `config-page` shows `Configuração` and the `Dados da obra` card only: no side navigation and no `Status da obra` card.
- `rename-in-place` turns the name row into a field with `Salvar` and `Cancelar`; `Escape` or `Cancelar` discards the draft.
- `rename-validation` shows `Informe o nome da obra.` for an empty name and `O nome pode ter no máximo 120 caracteres.` for a longer one, and sends nothing.
- `rename-propagation` updates the header and the card on save and the list when the user goes back, and leaves the project's last activity unchanged.
- `rename-assistant-lock` shows an assistant the name, no `Renomear` and `Só o gerente de obra ou o admin da construtora renomeia a obra.`.
- `rename-delivered-lock` shows everyone, on a delivered project, no `Renomear` and `A obra foi entregue: o nome e a reserva não podem mais ser alterados.`.
- `reservation-row` shows every role the `Unidades` row, `Usa <usadas> de <reservadas> reservadas`; the manager and the assistant get no `Alterar reserva`, and a delivered project reads `Usou <usadas> unidades.`.
- `reservation-dialog` opens from `Alterar reserva` (admin, project in progress) with the reservation in a focused field, the line `A obra usa N unidades. A construtora tem M livres.` and two figures, `Restam na obra` and `Livres na construtora`, that follow the typed number and show `Antes: ...` once it differs from the reservation.
- `reservation-validation` shows `A obra já usa N unidades. A reserva não pode ficar abaixo disso.` below the usadas and `Só há M unidades livres.` above the reservation plus the livres, once the field loses focus or on `Enter`, and keeps `Salvar` disabled.
- `reservation-save` closes the dialog, updates the row, toasts `Reserva da <obra>: N unidades.` and moves the livres (the project list and the Nova obra help read them).
- `reservation-link` opens the dialog on arrival at `/projects/<id>/configuration?reserva=alterar` (admin, project in progress); closing it clears the address.
- `reservation-states` shows `Salvando…` while saving, the server's numbers under the field when the usadas or the livres changed meanwhile, the delivered view when the save finds the project delivered, and a destructive alert `Não foi possível salvar a reserva. Confira sua conexão e tente de novo.` on a network failure. Not reachable on a healthy instance; the web route-tree tests cover them.
- `rename-states` shows `Salvando…` while saving, a destructive alert `Não foi possível salvar o nome. Confira sua conexão e tente de novo.` with the draft kept on a failure, and the delivered view when the save finds the project delivered. Not reachable on a healthy instance; the web route-tree tests cover them.

## How to get to it (user POV)

- Open a project from `/projects`, then tap `Configuração da obra` (the gear icon on the phone).
- Open `/projects/<id>/configuration` directly.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run `.claude/skills/verify/journeys/project-configuration.ts` with `--as admin`, `--as manager` (Carla, manager of `Residencial Jardins` and of the delivered `Residencial Vila Nova`) and `--as assistant` (Elisa, assistant of `Residencial Jardins`), each on `--device both`. The admin and manager runs rename the project and rename it back, so they can repeat on one instance.

- **Entry.** `page.goto("/projects?q=Jardins")`, click the card, `page.getByRole("link", { name: "Configuração da obra" })` is visible; clicking it lands on `/projects/<uuid>/configuration`.
- **Page.** `page.getByRole("heading", { level: 2, name: "Configuração" })` and `page.getByRole("region", { name: "Dados da obra" })` are visible, `page.getByText("Status da obra")` and `page.getByRole("navigation")` have no match.
- **Rename.** In the card, `getByRole("button", { name: "Renomear" }).click()`; `getByRole("textbox", { name: "Nome da obra" })` is focused. `fill("")` then `Salvar` shows `Informe o nome da obra.`; 121 characters show the length message; `Escape` closes the field. Rename to `Residencial Jardins II`, `Salvar`: the `h1` and the card show it. `Início da obra`, then `Obras`, then `page.getByPlaceholder("Buscar obra").fill("Jardins II")` finds the card. Rename it back.
- **Last activity.** `SELECT last_activity_at FROM project WHERE id = $1` through `query`, with the id from the `/projects/<uuid>/configuration` URL, is the same before and after the rename.
- **Reservation row.** Every role: `card.getByText("Unidades", { exact: true })` and `Usa <usadas> de <reservadas> reservadas`, with the numbers from `SELECT count(*) FROM location WHERE project_id = $1 AND type = 'unit'` and `SELECT reserved_units FROM project WHERE id = $1`. Manager and assistant: `getByRole("button", { name: "Alterar reserva" })` has no match.
- **Reservation dialog (admin).** `Alterar reserva` opens `getByRole("dialog", { name: "Alterar reserva" })`; the `Unidades reservadas` field is focused with the reservation. `fill(reserva + 1)` shows two `Antes:` lines; `fill(usadas - 1)` then `blur()` shows the below-usadas error and disables `Salvar`; `fill(reserva + livres + 1)` then `blur()` shows `Só há <livres> unidades livres.`. `fill(reserva + 1)` and `Salvar` toasts, updates the row and `reserved_units` in the database. Set it back at the end.
- **Assistant.** With `--as assistant` the card has no `Renomear` and shows the lock line.
- **Delivered.** `page.goto("/projects?status=delivered&q=Vila Nova")`, open the card, `Configuração da obra`: the card has no `Renomear` and no `Alterar reserva`, reads `Usou <n> unidades.` and shows the delivered lock line (admin and manager only; Elisa is not on that project).

## Gotchas

- The `h1` and the card both show the name: scope name assertions to `getByRole("region", { name: "Dados da obra" })` or to `getByRole("heading", { level: 1 })`.
- The back link is named `Início da obra` here and `Obras` on the home.
- The list search box has the placeholder `Buscar obra`; the `Obras` back link returns to the unfiltered list.
- The dialog is a `dialog` role on both devices (a sheet on the phone), so the same selectors work; its `Salvar` is outside the form element and tied to it by `form`.
- Rename the project back, and set the reservation back, at the end of a journey: the second device run starts from the first one's data.
- The first `Salvar` focus ring and the selected text in the field are the browser's, not a defect.
