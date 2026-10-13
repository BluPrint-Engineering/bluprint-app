# Project filters, search and sort

On `/projects` a user narrows the list by name, by status (`Em andamento`, `Entregue`, `Todas`) and, as an admin, by manager, and orders it (`Mais recentes`, `Nome A–Z`, `Atividade recente`). Every choice is written to the address, so a filtered list can be reloaded or shared. The desktop has these controls in a toolbar; the phone keeps search on screen and the rest in a `Filtros` sheet.

## Sub-features

- `filters-search` filters by name as the user types, and `Limpar busca` clears it.
- `filters-status` switches between projects in progress, delivered and all.
- `filters-manager` (admin only) shows the projects of one manager.
- `filters-sort` reorders the list.
- `filters-clear` resets every filter with `Limpar filtros`.
- `filters-phone-sheet` applies the same choices from the phone sheet, whose button previews the count (`Ver 2 obras`).
- `filters-empty` shows `Nenhuma obra encontrada` when nothing matches.

## How to get to it (user POV)

- Desktop: the toolbar above the list.
- Phone: the search field above the list, and the `Filtros` button for everything else.
- Any device: an address with `?q=`, `?status=`, `?manager=` or `?sort=`.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run with `--as admin`; `filters-manager` does not exist for a manager.

- **Search.** `page.getByRole("textbox", { name: "Buscar obra pelo nome" }).fill("Aurora")`. The list narrows to `Edifício Aurora` and the address gains `q=Aurora`. `page.getByRole("button", { name: "Limpar busca" }).click()` restores `14 obras`.
- **Desktop manager.** `page.getByRole("button", { name: "Gerente: Todos" }).click()`, then `page.getByRole("menuitemradio", { name: "Diego Almeida" }).click()`. The address matches `/projects?manager=`, `2 obras` is visible with `Edifício Aurora` and `Condomínio Porto Belo`, and `Residencial Jardins` is hidden.
- **Desktop clear.** `page.getByRole("button", { name: "Limpar filtros" }).click()`. The address is `/projects` and `14 obras` is back.
- **Desktop status.** `page.getByRole("radio", { name: "Entregue" }).click()`. The address gains `status=delivered` and the delivered projects (`Residencial Vila Nova`, `Edifício Lagoa Azul`, `Condomínio Bela Vista`) are listed.
- **Desktop sort.** `page.getByRole("button", { name: /^Ordenar:/ }).click()`, then `page.getByRole("menuitemradio", { name: "Nome A–Z" }).click()`. The address gains `sort=name` and the first card is `Condomínio Porto Belo`.
- **Phone sheet.** `page.getByRole("button", { name: "Filtros" }).click()`; in `page.getByRole("dialog", { name: "Filtros" })` click `getByRole("radio", { name: "Diego Almeida" })`, then `getByRole("button", { name: "Ver 2 obras" })`. The address matches `/projects?manager=` and `page.getByText("2 obras", { exact: true })` is visible. With a filter active the button is named `Filtros, 1 ativo`.
- **No match.** Search `zzz`. `Nenhuma obra encontrada` is visible.

## Gotchas

- Search is debounced; wait for the address or the list, not a fixed sleep.
- `2 obras` also matches `12 obras` and `Ver 2 obras` unless `{ exact: true }`.
- On the phone the sheet's choices apply only on `Ver … obras`; closing the sheet discards them.
