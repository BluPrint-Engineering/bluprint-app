# New project

From `/projects/new` the organization's admin creates a project: a name and how many units to reserve, with the free units shown as help (`300 livres na construtora. Depois de criar, sobram 225.`). Creating lands on the new project's configuration with the toast `Obra “Casa Moinhos” criada.`. Without free units the page is disabled and says so. Managers and assistants never see the page: they go back to `/projects`.

## Sub-features

- `new-project-help` shows the free units under `Unidades reservadas`, live as the number is typed (`sobram`, `sobra 1`), and a skeleton while they load.
- `new-project-validation` shows `Informe o nome da obra.`, `O nome pode ter no máximo 120 caracteres.`, `Informe quantas unidades reservar.` and `De 1 a <livres> unidades.` before sending; the reservation field drops non-digits.
- `new-project-create` sends once (button and Enter blocked while `Criando obra…`), lands on `/projects/<uuid>/configuration` with the toast, and reserves the units.
- `new-project-retry` reuses one project id for every retry of the same page, so a failure never creates a second project. Not reachable on a healthy instance; the web route-tree and API integration tests cover it.
- `new-project-race` keeps the typed values and shows `Agora só restam N unidades livres. Ajuste a reserva e tente de novo.` when another admin reserved first. Not reachable on a healthy instance; the route-tree tests cover it.
- `new-project-no-units` disables both fields and the button, with an alert that only suggests lowering another project's reservation when some reservation is unused; the admin of Vértice (Igor) reaches it.
- `new-project-admin-only` sends a manager or assistant who opens the URL back to `/projects`, silently.

## How to get to it (user POV)

- Tap `Nova obra` on `/projects` (see [project-list.md](./project-list.md)), or open `/projects/new` directly.

## Driving it with drive.ts

Preconditions:

- `instance.ts doctor` prints no `FAIL`.
- Run `.claude/skills/verify/journeys/new-project.ts` with `--as admin` (Ana, creates `Casa Moinhos` reserving 12, so both devices fit in the seed's free units), `--as admin-no-units` (Igor of Vértice, proves `new-project-no-units`) and `--as manager` (proves `new-project-admin-only`), each on `--device both`. The admin run creates a project per device; the next `up` reseeds.

- **Help.** `page.getByText("<free> livres na construtora. Dá para ajustar depois.")`; after `getByRole("textbox", { name: "Unidades reservadas" }).fill("1x2")` the field reads `12` and the help reads `Depois de criar, sobram <free - 12>.`.
- **Validation.** `fill` a number above the free units with an empty name, click `Criar obra`: both messages show.
- **Create.** Fill `Nome da obra` and `Unidades reservadas`, click `Criar obra`; `toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/)` and the toast is visible. `SELECT name, reserved_units FROM project WHERE id = $1` through `query` returns the typed name and 12, and `/api/organization/units` reports `free` lower by 12.
- **No free units.** With `--as admin-no-units`, the fields and `Criar obra` are disabled and no help line shows.

## Gotchas

- The free units come from `/api/organization/units`; read them there instead of hard-coding the seed's number.
- The toast is rendered by the app layout, so it survives the navigation; it disappears after 6 seconds.
- Igor can only reach the disabled state: his organization has no free units, so he cannot create.
