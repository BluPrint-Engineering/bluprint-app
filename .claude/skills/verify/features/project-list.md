# Project list

`/projects` (Obras) is the home screen: a card per project the user can see, each one a link to the project's home, with a total such as `14 obras`. The organization's admin also sees the free units and `Nova obra`: beside the title on the desktop, in a fixed bar at the bottom on the phone, inside the empty block when there is no project. On the phone the list is one column and loads more as it scrolls; on the desktop it is paged, with the page in the address and a pager at the bottom.

## Sub-features

- `projects-home` lands a signed-in user on `/projects` from `/`.
- `projects-phone-scroll` shows 12 cards in one column on the phone and loads the rest on scroll, with no pager; a `Carregar mais` fallback button sits below the list until everything is loaded.
- `projects-desktop-pages` shows `Mostrando 1–12 de 14` and pages with `Página 2`, putting `?page=2` in the address.
- `projects-role-scope` shows an admin every project of the organization and a manager only theirs.
- `projects-card-link` makes the whole card a link to `/projects/<id>` (see [project-home.md](./project-home.md)).
- `projects-new-entry` shows the admin the free units as text (`290 unidades livres`, `1 unidade livre`) and `Nova obra`, a link to `/projects/new`. A manager or assistant sees neither.
- `projects-no-units` disables `Nova obra` when no unit is free: `Nenhuma unidade livre. Baixe a reserva de uma obra ou fale com a BluPrint.` while some project has an unused reservation, `Nenhuma unidade livre. Fale com a BluPrint.` when none has. Igor of Vértice reaches the first.
- `projects-bar-hidden` takes the phone's bar away when the list fails to load or the connection is down. Not reachable on a healthy instance; the web route-tree tests cover it.
- `projects-empty` shows an admin whose organization has no project `Nenhuma obra ainda`, and any other user linked to no project `Nenhuma obra por aqui`.

## How to get to it (user POV)

- Open `/` or `/projects` signed in.
- Sign in; the login lands here.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run with `--as admin` (Ana sees 14 projects in progress).

- **Home.** `await page.goto("/")`. The URL becomes `/projects`, `page.getByRole("heading", { name: "Obras" })` and `page.getByText("14 obras")` are visible, and `page.getByRole("list", { name: "Obras" }).getByRole("listitem")` has 12 items.
- **Phone scroll** (`device === "phone"`). `cards.last().scrollIntoViewIfNeeded()`. The list grows to 14 and `Residencial Jardins` is visible; `page.getByRole("navigation", { name: "Páginas de obras" })` and `page.getByRole("button", { name: "Carregar mais" })` are hidden.
- **Desktop pages** (`device === "desktop"`). `page.getByText("Mostrando 1–12 de 14")` is visible. `page.getByRole("button", { name: "Página 2" }).click()`; the URL becomes `/projects?page=2`, the list has 2 items, and `Mostrando 13–14 de 14` is visible.
- **Manager scope.** With `--as manager`, the list holds only Carla's projects and no `Gerente:` button exists.
- **Card link.** `page.getByRole("link", { name: /Residencial Jardins/ })` has an `href` of `/projects/<uuid>`; clicking it lands on the project's home.
- **Empty.** Sign up a new account (see [sign-up.md](./sign-up.md)); it is its organization's admin, so its `/projects` shows `Nenhuma obra ainda` with `Nova obra` and `500 unidades livres` under it.
- **New project entry.** Run `.claude/skills/verify/journeys/project-list.ts` with `--as admin` (the free units come from `/api/organization/units`; `Nova obra` has `href="/projects/new"` and opens the page), `--as admin-no-units` (the disabled button and the `Baixe a reserva de uma obra` sentence) and `--as manager` (no `Nova obra`, no units line), each on `--device both`.

## Gotchas

- `Mostrando 1–12 de 14` uses an en dash, not a hyphen.
- The total counts only projects in progress: the status filter defaults to `Em andamento`, and the 3 delivered projects of Construtora Horizonte appear only under `Entregue` or `Todas`.
- The phone list loads its next page when the last card scrolls into view; assert on the card count, not on a scroll position.
- The free units line is text until the Unidades screen exists: assert on the text, not on a link.
- On the phone the bar is `position: fixed`, so a full-page `shot` draws it at the viewport's bottom, in the middle of a long list; it is not a layout bug.
- A full-page `shot` does not scroll, so a phone capture right after landing still shows `Carregar mais` under 12 cards.
