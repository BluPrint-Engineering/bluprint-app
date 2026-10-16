# Project structure

A project's home at `/projects/<id>` shows its structure: a card per tower when there are several, the tower's façade directly when there is one, and the project's common areas. A tower at `/projects/<id>/locations/<towerId>` reads as its façade, one floor per row with the highest on top, units in columns aligned on the widest floor and common areas in a column of their own. A floor lists its units, each with its unit type and changes, and its common areas; a unit opens its unit type and its rooms, a common area opens its rooms. Everything is read-only for now, for every role and for a delivered project, which adds the lock line `A obra foi entregue: a estrutura não pode mais ser alterada.`

## Sub-features

- `home-empty` shows `A obra ainda não tem estrutura` with `A estrutura aparece aqui quando alguém da equipe montar a obra.` and no button (E1); a delivered project without structure shows it under the lock line.
- `home-towers` shows `Torres` with a card per tower (Andares, Unidades, Áreas comuns, Tipologias: `Tipologia A, Tipologia B, Cobertura`, or `Sem tipologia`) and `Áreas comuns da obra` (E2); a delivered project adds the lock line (E5).
- `home-single-tower` shows `Fachada` and `Áreas comuns` with the tower's and the project's common areas, and the tower's name nowhere (E3).
- `tower-facade` shows the façade, `Áreas comuns da torre`, the band `Torre · 15 andares · 50 unidades` and the back link to the project (T1); a tower without floors shows `A Torre B ainda não tem andares` (T3); a delivered project adds the lock line (T6).
- `floor-lists` shows `Unidades`, each row with `Tipologia A`, `Tipologia A · 3 alterações` or `Sem tipologia`, `Áreas comuns do andar`, the band `Andar · Torre A · 4 unidades` and the back link to the tower (F1); with a single tower both drop the tower.
- `unit-page` shows the `Tipologia` card (name, an outline badge `3 alterações` when it has changes, `Os cômodos acompanham a Tipologia A. ...`; without one `Sem tipologia` and `Os cômodos desta unidade são só dela.`), the `Cômodos` list with the count, `Só desta unidade` on the rooms only the unit has, and `Tirados desta unidade` with `Da Tipologia A` (U1, U2). No button or menu yet.
- `common-area-page` shows only the `Cômodos` card, no `Tipologia` (U5); a common area without rooms says `Nenhum cômodo cadastrado.`.
- `location-band` shows a unit in mono with `Unidade · Torre A · 9º andar` and a common area with `Área comum · da obra`.
- `location-not-found` shows `Local não encontrado` with `Voltar para a obra` for a location that does not exist, belongs to another project or sits in a project the user cannot see (T5).
- `load-states` shows `Carregando estrutura`, `Não foi possível carregar a obra` / `o local` with `Tentar de novo`, and `Sem conexão.`. Not reachable on a healthy instance; the web route-tree tests cover them.

## How to get to it (user POV)

- Tap a project card on `/projects`, then a tower card, a floor label, a unit or a common area.
- Open `/projects/<id>` or `/projects/<id>/locations/<locationId>` directly.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run `.claude/skills/verify/journeys/structure.ts` with `--as admin` (Ana sees every project); `--as manager` (Carla) reaches the projects she is on and gets `Obra não encontrada` elsewhere.

Where the seed (`apps/api/src/db/seed/fixture.ts`) holds each edge case:

| Case | Project | Where |
| --- | --- | --- |
| Two different towers with `Tipologia A`, `Tipologia B` (odd and even finals) and `Cobertura` applied, a `Duplex` type no unit follows, 903 with a room added, one dropped and one renamed (`3 alterações`), 902 with one dropped (`1 alteração`), 1204 without a unit type and with three rooms of its own, `Salão de festas` with `Cozinha` and `Banheiro`, ground floor with a hall, 13th floor renamed `Cobertura`, `Subsolo` moved below `Térreo`, common areas at the three levels | `Residencial Jardins` (Horizonte) | Torre A: 50 units, `Subsolo`, `Térreo`, 1º-12º with 4 units and a `Hall`, `Cobertura` with 1301 and 1302 and `Terraço`, `Salão de festas`; Torre B: 1º-10º with 2 units; `Guarita` on the project |
| Single tower, letter numbering, long common area name | `Edifício Aurora` | 1A-8C, `Salão de festas e espaço gourmet com churrasqueira coberta` |
| About 500 units | `Parque das Águas · Fase 2` | three towers, 504 units, no member besides the admin |
| Tower without floors in a project with several towers | `Condomínio Porto Belo` | Torre B, with `Salão de festas`; Diego (manager) is on it |
| Delivered with structure | `Residencial Vila Nova` | two towers; Carla and Heitor are on it |
| Delivered without structure | `Condomínio Bela Vista` | |
| No structure | `Galpão Logístico Sul` and the other in-progress projects | |
| Same names in another organization, reserving exactly its units | `Residencial Jardins` (Vértice) | Torre A, units 101-302, 0 free |

- **Home states.** `page.goto("/projects/" + id)` with the id from `SELECT id FROM project WHERE name = ... AND organization_id = ...` through `query`; assert the headings above.
- **Façade.** On a tower, `page.getByRole("list", { name: "Fachada da Torre A" })` has one `listitem` per floor, the first being `Cobertura`; `page.getByRole("link", { name: "Unidade 903" }).click()` opens the unit.
- **Back links.** From a floor `page.getByRole("link", { name: "Torre A" }).click()` returns to the tower; the first link of the band returns to the project.
- **Not found.** `page.goto("/projects/<id>/locations/0190b000-0000-7000-8000-999999999999")` shows `Local não encontrado`; `Voltar para a obra` lands on the project.

## Gotchas

- Read the ids with `query`: they are generated on seed and change with every `up`.
- A unit's rooms and unit type are seeded only on `Residencial Jardins` (types A, B, Cobertura, Duplex), `Edifício Aurora` (`Apartamento`), `Parque das Águas · Fase 2` (`Padrão`), `Residencial Vila Nova` and Vértice's `Residencial Jardins` (`Tipologia A`); the other projects have no unit types.
- A floor's unit link is named by its row text (`903 Tipologia A · 3 alterações`): select it with a regex such as `/^903/`.
- Two projects are named `Residencial Jardins` (Horizonte and Vértice): filter by organization or sign in as Ana, who sees only Horizonte's.
- The façade links are named by their label (`9º andar`, `Unidade 903`); the visible text of a floor is shortened (`9º`).
- No tower name appears anywhere in a single-tower project, so select its floors and units by name.
