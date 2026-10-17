# BluPrint verification map

The maintained source for verifying BluPrint's user-facing behaviour. Read this index before driving the app, then use the matching feature file as the recipe. A proof that drives one convenient entry point is incomplete when the file lists others.

## Baseline preconditions

- An instance started by this run with `bun .claude/skills/verify/scripts/instance.ts up`, and `instance.ts doctor` printing no `FAIL`.
- The seed from `apps/api/src/db/seed/fixture.ts`, freshly applied by `up`. Construtora Horizonte has 14 projects in progress and 3 delivered, five of them with structure (see [Project structure](./structure.md)); Ana Ribeiro (`ana@horizonte.test`, admin) sees all of them, Carla Mendes (`carla@horizonte.test`, manager) only those she belongs to; Elisa Rocha (`elisa@horizonte.test`, assistant) is on `Residencial Jardins` and `Edifício Aurora`. Every seeded password is `canteiro-de-obras-azul`.
- Never drive an instance this run did not start.

## Driving conventions

- Drive through `drive.ts` journeys; the feature files give each step as Playwright calls on the journey's `page`.
- Select by ARIA role and accessible name, or by label. Interface text is pt-BR; keep it verbatim, accents included.
- Wait on web-first assertions (`await expect(locator).toBeVisible()`), never a fixed sleep.
- Run every interface journey on `--device both`. The phone and desktop layouts differ: a feature file says where.
- A mutation that changes seeded data (a new account, a sign-out) needs no restore: the next `up` reseeds.

## Proof and skip reporting

- Capture the action and the resulting state with `shot`, not only the final screen.
- Prove side effects with `query` or `/api/auth/get-session`, alongside the screen.
- Record the feature file and sub-feature IDs proved with the evidence dir.
- Report an entry point you could not reach with the attempted step and the unmet precondition. Do not report it verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behaviour, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with drive.ts`, `Gotchas`.

## Features

- [Sign in](./sign-in.md): the login screen, wrong-password and rate-limit errors, the redirect back to a protected page, a session that survives reload.
- [Sign up](./sign-up.md): self-signup scaffolding, the terms checkbox, landing signed in.
- [Account menu and sign out](./account-menu.md): the header account menu, theme choice, signing out.
- [Project list](./project-list.md): the Obras screen, phone infinite scroll versus desktop pagination, the admin's free units link to Unidades and `Nova obra` entry.
- [Project home and not found](./project-home.md): a card opens the project's home (name, status, role, blank state), and the not-found pages for unknown addresses and projects the user cannot see.
- [Project configuration, rename, reservation and delivery](./project-configuration.md): the configuration page (`Dados da obra`, `Status da obra`, `Estrutura`, `Tipologias`, side navigation), renaming in place, why an assistant or a delivered project cannot rename, the units row, the admin's `Alterar reserva` dialog and delivering the project through its confirmation dialog.
- [New project](./new-project.md): the Nova obra page, its free-units help, validation, creation and the page without free units.
- [Project structure](./structure.md): a project's home with its towers or façade, the `Montar estrutura` wizard (steps, tipologias and where they apply, preview, validation, reservation, creation), adding towers, units and common areas in place and renaming them, the tower façade, the floor lists with each unit's unit type, the unit page with its unit type and rooms, adding, renaming and taking out rooms, changing the unit type and returning to it, the common area's rooms, the configuration's `Estrutura` summary and `Tipologias` editing, and where the seed holds each edge case.
- [Units](./units.md): the admin's Unidades screen from the free units link, every project in progress with its reservation side by side, live figures, one save for all changes, and why anyone else is sent back to `/projects`.
- [Project filters, search and sort](./project-filters.md): status, manager, name search and sort, from the desktop toolbar and the phone sheet.
