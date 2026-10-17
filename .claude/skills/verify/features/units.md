# Units

From the free units link on `/projects` the organization's admin opens `/units` (Unidades): Contratadas, Reservadas and Livres, and one row per project in progress with its Usadas, an editable Reserva and what Restam. Lowering one reservation and raising another moves units between projects; the figures change as the numbers are typed and `Salvar` sends every change at once, all or nothing, with the toast `Reservas salvas.`. Delivered projects are not rows: a line says how many used how many units. Managers and assistants never see the screen: they go back to `/projects`.

## Sub-features

- `units-entry` reaches the screen from the free units link (`<free> unidades livres`) on the project list, and from `Baixe a reserva de uma obra` when no unit is free and some reservation is unused.
- `units-ready` shows the three figures, one row (desktop table) or card (phone) per project in progress by name with Usadas, Reserva and Restam, and `N obras entregues usaram M unidades.` when a project was delivered. Rows plus the delivered units add up to Reservadas.
- `units-editing` marks a changed row (`Antes: 120`), shows `Antes: N` under a changed figure, counts `N reservas alteradas` and keeps Livres equal when units only move; on the phone a fixed bar shows the count, `Livres N`, `Descartar` and `Salvar`.
- `units-below-used` shows `A obra já usa N unidades. A reserva não pode ficar abaixo disso.` under the row after the field loses focus, Restam negative in red, and disables `Salvar`.
- `units-over-contracted` shows `As reservas passam das unidades contratadas em N. Baixe alguma reserva ou fale com a BluPrint.` at the top, Livres negative in red, and disables `Salvar`.
- `units-save` sends only the changed rows in one `PATCH /api/organization/units/reservations`, shows `Salvando…` with the inputs and `Descartar` disabled, then settles on the saved values with the toast. `Descartar` drops every draft at once.
- `units-save-failed` keeps the typed values and shows `Não foi possível salvar as reservas. Confira sua conexão e tente de novo.` next to the buttons. A refusal by the server (`RESERVATION_BELOW_USED`, `NO_UNITS_LEFT`, `PROJECT_DELIVERED`) keeps the draft and says why; the web route-tree and API integration tests cover those.
- `units-loading-error` holds skeletons of the same size while it loads and shows `Não foi possível carregar as unidades` with `Tentar de novo` when it fails. Not reachable on a healthy instance; reach it by intercepting the request with `page.route`.
- `units-none-in-progress` shows `Nenhuma obra em andamento` under the figures, with what the delivered projects used. Not reachable in the seed (14 projects in progress); reach it by intercepting the reservations request.
- `units-admin-only` sends a manager or assistant who opens `/units` back to `/projects`, and the API answers them 403.

## How to get to it (user POV)

- As the admin, tap the `<free> unidades livres` link on `/projects` (see [project-list.md](./project-list.md)), or open `/units`.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run `.claude/skills/verify/journeys/units.ts` with `--as admin` and `--as manager`, each on `--device both`. The admin run moves 10 units between two projects per device and saves; the next `up` reseeds.

- **Entry.** From `/projects`, click `page.getByRole("link", { name: "<free> unidades livres" })`; the URL becomes `/units`.
- **Ready.** Read `/api/organization/units` and `/api/organization/units/reservations`; the figures show `contracted`, `reserved` and `free`, `Σ items.reserved + delivered.used` equals `reserved`, and each input `getByRole("textbox", { name: "Reserva de <name>" })` holds the saved reservation.
- **Editing.** Lower the project with the most spare units and raise another by the same amount: `2 reservas alteradas`, Livres unchanged, `Antes: <saved>` visible.
- **Below used.** `fill` a project's `used - 1`, `blur()`: the row error shows and `Salvar` is disabled.
- **Over contracted.** `fill` a row to `reserved + free + 1`: the top alert says `em 1` and `Salvar` is disabled.
- **Save.** After `Descartar`, repeat the move and click `Salvar`: `Reservas salvas.`, no `Salvar` button, and `SELECT id, reserved_units FROM project WHERE id = ANY($1)` through `query` returns the new reservations while `free` is unchanged.
- **Not admin.** With `--as manager`, `/units` ends at `/projects` and `GET /api/organization/units/reservations` answers 403.

## Gotchas

- Read the numbers from the two API routes; do not hard-code the seed's.
- Both devices run in one instance, so the second device starts from the first one's saved reservations: pick rows from the API, never by name.
- The desktop footer and the phone bar are sticky or fixed, so a full-page `shot` draws them in the middle of a long list; it is not a layout bug.
- The unit tests and the journey need Postgres on `localhost:5432`; never start it from a journey.
