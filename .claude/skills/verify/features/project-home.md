# Project home and not found

A project card on `/projects` opens the project's home at `/projects/<id>`: a header with the back link `Obras`, the project name in full, the status badge (`Em andamento` or `Entregue`) and, for a manager or assistant, their role. A project with no structure shows `A obra ainda não tem estrutura` and no button. An address that does not exist, a project that does not exist or one the user does not belong to shows a not-found page with `Voltar para obras`.

## Sub-features

- `home-card-link` opens the home from a project card on the list.
- `home-header` shows the name, the status badge and, for a manager, `Gerente de obra`; an admin sees no role.
- `home-blank` shows `A obra ainda não tem estrutura` with `As pendências aparecem aqui quando a obra tiver estrutura.` and no button; a delivered project shows the same block under the `Entregue` badge.
- `home-load-states` shows the header skeleton while loading, `Não foi possível carregar a obra` with `Tentar de novo` on a failure and `Sem conexão.` offline. Not reachable on a healthy instance; the web route-tree tests cover them.
- `notfound-route` shows `Página não encontrada` for an address that matches no route.
- `notfound-project` shows `Obra não encontrada` for an id that is not a UUID (no API call) and for a UUID that is no project of the user's organization or that the user is not on.
- `notfound-signed-out` sends a signed-out visitor to `/login` with the address in `redirect`, never to a not-found page.

## How to get to it (user POV)

- Tap a card on `/projects`.
- Open `/projects/<id>` directly.
- Open any other address, such as `/nao-existe`.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run `.claude/skills/verify/journeys/project-home.ts` with `--as admin` and again with `--as manager` (Carla is the manager of `Residencial Jardins` and of the delivered `Residencial Vila Nova`); `--as none` for `notfound-signed-out`.

- **Open from the list.** `page.goto("/projects?q=Jardins")`, then `page.getByRole("link", { name: /Residencial Jardins/ }).click()`. The URL matches `/projects/<uuid>`, `page.getByRole("heading", { level: 1, name: "Residencial Jardins" })` and `page.getByText("Em andamento")` are visible, `A obra ainda não tem estrutura` is visible and `page.getByRole("main").getByRole("button")` has no match. As a manager `page.getByText("Gerente de obra")` is visible; as an admin it is not.
- **Back.** `page.getByRole("link", { name: "Obras", exact: true }).click()` returns to `/projects`.
- **Delivered.** `page.goto("/projects?status=delivered&q=Vila Nova")`, click the card; `page.getByText("Entregue")` is visible and `Em andamento` is not.
- **Not found.** `page.goto("/projects/not-a-uuid")` and `page.goto("/projects/0190a000-0000-7000-8000-000000000000")` show `page.getByRole("heading", { level: 1, name: "Obra não encontrada" })`; `page.goto("/nao-existe")` shows `Página não encontrada`. `page.getByRole("link", { name: "Voltar para obras" }).click()` lands on `/projects`.
- **A project the user is not on.** `SELECT id FROM project WHERE name = 'Galpão Logístico Sul'` through `query`, then `page.goto("/projects/" + id)`: as Carla (not a member) the page shows `Obra não encontrada`, as Ana (admin) it shows the project's name.
- **Signed out.** `--as none`: `page.goto("/projects/0190a000-0000-7000-8000-000000000000")` ends on `/login?redirect=...`.

## Gotchas

- The configuration entry (`Configuração da obra`) does not exist yet; its absence is correct.
- The back link is named `Obras`, and the header logo link is `BluPrint, obras`: select the back link with `{ name: "Obras", exact: true }`.
- `Entregue` also appears as a filter label on the list; assert it on the project page only.
- The not-found pages keep the app header, so the account menu is still there.
