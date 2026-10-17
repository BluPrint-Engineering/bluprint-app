# Project configuration, rename, reservation and delivery

From a project's home, `Configuração da obra` opens `/projects/<id>/configuration`: the header keeps the project's name and status, the back link reads `Início da obra`, and two cards, `Dados da obra` and `Status da obra` (with a side navigation on the desktop), hold the project's name and its units row (`Usa 70 de 120 reservadas`). The admin and the project's manager rename it in place with `Renomear`; the new name shows in the header and in the list without a reload. An assistant, and everyone on a delivered project, reads the name with a lock line saying why it cannot change. Every role reads the reservation; only the admin changes it, in the `Alterar reserva` dialog (a centered dialog on the desktop, a sheet on the phone), and a delivered project shows `Usou N unidades.` with no action. The admin and the project's manager deliver the project from `Status da obra`, through a confirmation dialog; delivery is final, records who and when, and returns the unused reservation to the free units.

## Sub-features

- `config-entry` shows `Configuração da obra` in the header of the project home: a button with text on the desktop, a 44px icon button with the same accessible name on the phone. Every role sees it.
- `config-page` shows `Configuração`, the `Dados da obra` card and the `Status da obra` card right after it; the desktop adds a side navigation `Seções da configuração` with `Dados da obra` and `Status da obra`, the phone has none.
- `rename-in-place` turns the name row into a field with `Salvar` and `Cancelar`; `Escape` or `Cancelar` discards the draft.
- `rename-validation` shows `Informe o nome da obra.` for an empty name and `O nome pode ter no máximo 120 caracteres.` for a longer one, and sends nothing.
- `rename-propagation` updates the header and the card on save and the list when the user goes back, and leaves the project's last activity unchanged.
- `rename-assistant-lock` shows an assistant the name, no `Renomear` and `Só o gerente de obra ou o admin da construtora renomeia a obra.`.
- `rename-delivered-lock` shows everyone, on a delivered project, no `Renomear` and `A obra foi entregue: o nome e a reserva não podem mais ser alterados.`.
- `reservation-row` shows every role the `Unidades` row, `Usa <usadas> de <reservadas> reservadas`; the manager and the assistant get no `Alterar reserva`, and a delivered project reads `Usou <usadas> unidades.`.
- `reservation-dialog` opens from `Alterar reserva` (admin, project in progress) with the reservation in a focused field, the line `A obra usa N unidades. A construtora tem M livres.` and two figures, `Restam na obra` and `Livres na construtora`, that follow the typed number and show `Antes: ...` once it differs from the reservation.
- `reservation-validation` shows `A obra já usa N unidades. A reserva não pode ficar abaixo disso.` below the usadas and `Só há M unidades livres.` above the reservation plus the livres, once the field loses focus or on `Enter`, and keeps `Salvar` disabled.
- `reservation-save` closes the dialog, updates the row, toasts `Reserva de <obra>: N unidades.` and moves the livres (the project list and the Nova obra help read them).
- `reservation-link` opens the dialog on arrival at `/projects/<id>/configuration?reserva=alterar` (admin, project in progress); closing it clears the address.
- `reservation-states` shows `Salvando…` while saving, the server's numbers under the field when the usadas or the livres changed meanwhile, the delivered view when the save finds the project delivered, and a destructive alert `Não foi possível salvar a reserva. Confira sua conexão e tente de novo.` on a network failure. Not reachable on a healthy instance; the web route-tree tests cover them.
- `status-card` shows `Status da obra` with the badge and, in progress, `A equipe registra e resolve pendências. …`; the admin and the project's manager get `Entregar obra`, an assistant gets `Só o gerente de obra ou o admin da construtora entrega a obra.` and no button. A delivered project reads `Entregue em dd/mm/aaaa por <nome>. A obra está fechada: …` for everyone, with no action.
- `deliver-dialog` opens from `Entregar obra` as an alert dialog (a sheet on the phone) titled `Entregar “<obra>”?`, with the three consequences and the checkbox `Entendi que a obra não poderá ser reaberta.` focused; `Entregar obra` stays disabled until it is ticked, and `Cancelar`, `Escape` and the scrim close it without delivering.
- `deliver-save` delivers: the dialog closes, the toast `Obra “<obra>” entregue.` shows, and the header badge, `Dados da obra` (`Usou N unidades.`, the lock line) and `Status da obra` read delivered without a reload; the database holds `status`, `delivered_by`, `delivered_at`, `reserved_units` equal to the used units and an unchanged `last_activity_at`, and the free units rise by the unused part.
- `deliver-states` shows `Entregando obra…` with everything locked while sending, a destructive alert `Não foi possível entregar a obra. Confira sua conexão e tente de novo.` above the buttons with the checkbox kept on a failure, and the delivered view when the project was delivered meanwhile. Not reachable on a healthy instance; the web route-tree tests cover them.
- `rename-states` shows `Salvando…` while saving, a destructive alert `Não foi possível salvar o nome. Confira sua conexão e tente de novo.` with the draft kept on a failure, and the delivered view when the save finds the project delivered. Not reachable on a healthy instance; the web route-tree tests cover them.

## How to get to it (user POV)

- Open a project from `/projects`, then tap `Configuração da obra` (the gear icon on the phone).
- Open `/projects/<id>/configuration` directly.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run `.claude/skills/verify/journeys/project-configuration.ts` with `--as admin`, `--as manager` (Carla, manager of `Residencial Jardins` and of the delivered `Residencial Vila Nova`) and `--as assistant` (Elisa, assistant of `Residencial Jardins`), each on `--device both`. The admin and manager runs rename the project and rename it back, so they can repeat on one instance. The admin run delivers `Villa Toscana` on the phone and `Edifício Solar do Campo` on the desktop, and delivery is final: a second admin run on the same instance fails at that step, so `down` and `up` first.

- **Entry.** `page.goto("/projects?q=Jardins")`, click the card, `page.getByRole("link", { name: "Configuração da obra" })` is visible; clicking it lands on `/projects/<uuid>/configuration`.
- **Page.** `page.getByRole("heading", { level: 2, name: "Configuração" })`, `page.getByRole("region", { name: "Dados da obra" })` and `page.getByRole("region", { name: "Status da obra" })` are visible; `page.getByRole("navigation", { name: "Seções da configuração" })` is visible on the desktop and has no match on the phone.
- **Rename.** In the card, `getByRole("button", { name: "Renomear" }).click()`; `getByRole("textbox", { name: "Nome da obra" })` is focused. `fill("")` then `Salvar` shows `Informe o nome da obra.`; 121 characters show the length message; `Escape` closes the field. Rename to `Residencial Jardins II`, `Salvar`: the `h1` and the card show it. `Início da obra`, then `Obras`, then `page.getByPlaceholder("Buscar obra").fill("Jardins II")` finds the card. Rename it back.
- **Last activity.** `SELECT last_activity_at FROM project WHERE id = $1` through `query`, with the id from the `/projects/<uuid>/configuration` URL, is the same before and after the rename.
- **Reservation row.** Every role: `card.getByText("Unidades", { exact: true })` and `Usa <usadas> de <reservadas> reservadas`, with the numbers from `SELECT count(*) FROM location WHERE project_id = $1 AND type = 'unit'` and `SELECT reserved_units FROM project WHERE id = $1`. Manager and assistant: `getByRole("button", { name: "Alterar reserva" })` has no match.
- **Reservation dialog (admin).** `Alterar reserva` opens `getByRole("dialog", { name: "Alterar reserva" })`; the `Unidades reservadas` field is focused with the reservation. `fill(reserva + 1)` shows two `Antes:` lines; `fill(usadas - 1)` then `blur()` shows the below-usadas error and disables `Salvar`; `fill(reserva + livres + 1)` then `blur()` shows `Só há <livres> unidades livres.`. `fill(reserva + 1)` and `Salvar` toasts, updates the row and `reserved_units` in the database. Set it back at the end.
- **Assistant.** With `--as assistant` the card has no `Renomear` and shows the lock line.
- **Delivery dialog (admin and manager).** In the `Status da obra` region, `Entregar obra` opens `getByRole("alertdialog", { name: "Entregar “Residencial Jardins”?" })`; the checkbox is focused and the dialog's `Entregar obra` is disabled until it is ticked; `Cancelar` closes it and `project.status` is still `active`.
- **Delivery (admin).** On a project with no members (`Villa Toscana` on the phone, `Edifício Solar do Campo` on the desktop), tick the checkbox and click the dialog's `Entregar obra`: the toast `Obra “<nome>” entregue.`, the header's `Entregue` badge, `Entregue em dd/mm/aaaa por Ana Ribeiro.` and `Usou <usadas> unidades.` show with no reload and the card has no `Entregar obra`. `SELECT status, reserved_units, delivered_at, last_activity_at, delivered_by FROM project WHERE id = $1` holds delivered, the used units, the time, the unchanged last activity and Ana's user; `/api/organization/units` `free` rose by the reserved minus the used units.
- **Assistant.** The `Status da obra` region shows the lock line `Só o gerente de obra ou o admin da construtora entrega a obra.` and no `Entregar obra`.
- **Delivered.** `page.goto("/projects?status=delivered&q=Vila Nova")`, open the card, `Configuração da obra`: the card has no `Renomear` and no `Alterar reserva`, reads `Usou <n> unidades.`, shows the delivered lock line, and the `Status da obra` region reads `Entregue em dd/mm/aaaa por Carla Mendes.` with no `Entregar obra` (admin and manager only; Elisa is not on that project).

## Gotchas

- The `h1` and the card both show the name: scope name assertions to `getByRole("region", { name: "Dados da obra" })` or to `getByRole("heading", { level: 1 })`.
- The back link is named `Início da obra` here and `Obras` on the home.
- The list search box has the placeholder `Buscar obra`; the `Obras` back link returns to the unfiltered list.
- The dialog is a `dialog` role on both devices (a sheet on the phone), so the same selectors work; its `Salvar` is outside the form element and tied to it by `form`.
- Rename the project back, and set the reservation back, at the end of a journey: the second device run starts from the first one's data.
- The first `Salvar` focus ring and the selected text in the field are the browser's, not a defect.
