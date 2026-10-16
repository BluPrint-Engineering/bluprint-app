# Project configuration and rename

From a project's home, `Configuração da obra` opens `/projects/<id>/configuration`: the header keeps the project's name and status, the back link reads `Início da obra`, and a single card, `Dados da obra`, holds the project's name. The admin and the project's manager rename it in place with `Renomear`; the new name shows in the header and in the list without a reload. An assistant, and everyone on a delivered project, reads the name with a lock line saying why it cannot change.

## Sub-features

- `config-entry` shows `Configuração da obra` in the header of the project home: a button with text on the desktop, a 44px icon button with the same accessible name on the phone. Every role sees it.
- `config-page` shows `Configuração` and the `Dados da obra` card only: no side navigation and no `Status da obra` card.
- `rename-in-place` turns the name row into a field with `Salvar` and `Cancelar`; `Escape` or `Cancelar` discards the draft.
- `rename-validation` shows `Informe o nome da obra.` for an empty name and `O nome pode ter no máximo 120 caracteres.` for a longer one, and sends nothing.
- `rename-propagation` updates the header and the card on save and the list when the user goes back, and leaves the project's last activity unchanged.
- `rename-assistant-lock` shows an assistant the name, no `Renomear` and `Só o gerente de obra ou o admin da construtora renomeia a obra.`.
- `rename-delivered-lock` shows everyone, on a delivered project, no `Renomear` and `A obra foi entregue: o nome não pode mais ser alterado.`.
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
- **Assistant.** With `--as assistant` the card has no `Renomear` and shows the lock line.
- **Delivered.** `page.goto("/projects?status=delivered&q=Vila Nova")`, open the card, `Configuração da obra`: the card has no `Renomear` and shows the delivered lock line (admin and manager only; Elisa is not on that project).

## Gotchas

- The `h1` and the card both show the name: scope name assertions to `getByRole("region", { name: "Dados da obra" })` or to `getByRole("heading", { level: 1 })`.
- The back link is named `Início da obra` here and `Obras` on the home.
- The list search box has the placeholder `Buscar obra`; the `Obras` back link returns to the unfiltered list.
- Rename the project back at the end of a journey: the second device run starts from the first one's data.
- The first `Salvar` focus ring and the selected text in the field are the browser's, not a defect.
