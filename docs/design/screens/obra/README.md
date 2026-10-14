# Handoff: Obra - Nova obra, tela da obra e página não encontrada (#46)

> **This is the brief for the Claude Design session**, written from the refinement of #46. The design
> session answers it with the usual bundle in this folder (`Obra.dc.html`, `Obra QA.dc.html`, `HANDOFF.md`)
> and rewrites this README as the screen handoff, as `../obras/README.md` did for the list. Everything under
> "Decided" is a product decision and is not reopened in the design session; everything else is the
> designer's call within the BluPrint design system.

## Overview

Three screens close epic #5, "Entrar e criar obra", and open the obra itself:

1. **Nova obra** (`/projects/new`): the admin types a name and the obra is created from one free license
   (RF-112, RF-201).
2. **Tela da obra**: an obra's **início** (`/projects/:id`) and its **configuração**
   (`/projects/:id/configuration`). Right after creating, the admin lands on the configuração to set the
   obra up. Anyone opening an obra from the list lands on the início.
3. **Página não encontrada**: today the app has no not-found page at all (no `notFoundComponent` in
   `apps/web/src`), and `/projects/:id` is the first route that can answer 404.

**Design the whole vision of the tela da obra**, not only what #46 builds: the início and the configuração
are the frame every later epic fills (structure #6, plans and pins #7, disciplines #8, units and contractors
#9, team #11, dashboards #13). Draw that frame with every section in place, then mark what #46 builds. The
**editors** inside each section (the structure editor above all) are **not** designed here: each gets its own
refinement and design session, starting with #6.

Read `docs/requisitos.md`, `CONTEXT.md` and `docs/adr/` before designing. The design system is
`.claude/skills/bluprint-design/` (voice, tokens, 44px tap targets, 52px primary action, lucide, light and
dark). A primitive or icon the system lacks is **added to the design system** with all its states, not only
to these screens.

## Who uses it

- **Admin** (*admin da construtora*): creates obras, often at a desktop. Has no membership on the obra and
  reaches it through the organization; configures it, never records pins (ADR 0024, ADR 0067).
- **Gerente de obra**: phone, inside an unfinished apartment, one hand busy, weak signal. Configures the
  obras they belong to and records pins.
- **Assistente de obra**: same context; configures the structure (RF-205) but does not rename the obra or
  change its status.

## Decided (from the refinement, do not reopen)

| Topic | Decision |
| --- | --- |
| Where the form lives | Its own page, `/projects/new`, on mobile and desktop. Not a sheet, not a dialog. |
| After creating | Go to `/projects/:id/configuration` of the new obra, toast "Obra “Casa Moinhos” criada." |
| Two routes for the obra | `/projects/:id` = início (the everyday entry, later the dashboard and the navigation); `/projects/:id/configuration` = configuração. The list card opens the início. |
| Who configures | The admin and everyone on the obra, each within their role (ADR 0067, glossary term *Project configuration*). |
| Rename | New RF-217: gerente de obra or admin rename the obra at any time, delivered included. The assistant does not. Renaming never frees the license. |
| Deliver / reopen (RF-215) | Belongs to the configuração ("Status" in Dados da obra), designed here, built in a later ticket of the obra screen, not in #46. |
| No license | Recognized by the API's `NO_FREE_LICENSE` code; the sentence is always "Sem licenças disponíveis. Fale com a BluPrint." |
| Retry is safe | The page generates the obra id when it opens; resending answers the obra already created, never a second one (ADR 0068). |
| Hidden, not faked | Sections whose epic is not built are **not shown** in the app, never "em breve". The design shows them all; the handoff marks which ship with #46. |
| Not found | Two cases: a route that does not exist, and an obra that does not exist or the person cannot see (the API answers 404 for both, to reveal nothing). |

## Route and files in `apps/web`

```
src/routes/__root.tsx                         ← notFoundComponent: the not-found page
src/routes/_authenticated/projects/new.tsx     ← Nova obra (admin only; others redirect to /projects)
src/routes/_authenticated/projects/$projectId/index.tsx          ← início
src/routes/_authenticated/projects/$projectId/configuration.tsx  ← configuração
src/features/projects/
  NewProjectPage/                              ← the form page
  ProjectPage/                                 ← início; ProjectHeader climbs out once configuração uses it
  ProjectConfigurationPage/                    ← configuração, with ProjectDetailsSection (Dados da obra)
  ProjectsPage/NewProjectAction.tsx            ← button + license count on the list (already designed in ../obras)
```

Files follow ADR 0053: everything starts in the page folder and climbs only when a second page needs it.

---

## Screens / views

Breakpoint **768px**, as on Obras. The app header (logo + user menu) is the same as on Obras.

### Lista de obras - what changes (already designed in `../obras/`)

- "Nova obra" (title row on desktop, fixed bottom bar on mobile, action in the admin empty state O5) is now a
  link to `/projects/new`.
- The card is now a link to `/projects/:id` (the whole card, as the Obras handoff already says).
- Nothing else changes on the list.

### Nova obra - `/projects/new` (admin only)

The form that creates an obra. It has one field, and the action cannot be undone: it consumes one of the
organization's licenses, and an obra is never deleted. Treat it like Entrar: one column within thumb reach,
nothing around it competing for attention.

- **Layout**: the app header, then the form at `--content-max` (26rem). Mobile: flat on the page, like
  Entrar on a phone. Desktop: the same form in a Card, centered. Above the title a back link "Obras"
  returns to `/projects` with the list's previous URL (filters kept).
- **Content**, top to bottom:
  1. Title "Nova obra".
  2. The license line, 14px `--muted-foreground`: "Usa 1 das 5 licenças disponíveis." /
     "Usa a última licença disponível." (exactly one left). Skeleton while the count loads; hidden if the
     count fails to load (the submit's no-license answer still covers that case).
  3. Field "Nome da obra", placeholder "Ex.: Casa Moinhos". Autofocus on desktop only: on a phone the
     keyboard would cover the page on arrival.
  4. Primary `lg` (52px) "Criar obra", full width on mobile.
- **Validation**, on the client before sending, same rules as the API (trimmed, 1–120 characters): empty →
  "Informe o nome da obra."; over 120 → "O nome pode ter no máximo 120 caracteres.". The error is icon +
  text under the field, never a red border alone. A repeated name is allowed and gets no warning.
- **Sending**: the button shows a spinner and "Criando obra…"; the button and Enter are locked until the
  answer arrives.
- **Success**: straight to the new obra's configuração, with the toast.
- **No license on submit** (another admin used the last one meanwhile): stays on the page, keeps the typed
  name, shows the destructive Alert "Sem licenças disponíveis. Fale com a BluPrint.", the license line turns
  into the same sentence and the button is disabled.
- **Opened with no free license** (a direct link): the no-license sentence in place of the license line,
  field and button disabled, the back link.
- **Other failure**: Alert "Não foi possível criar a obra. Confira sua conexão e tente de novo.", the name
  kept, the button enabled again.
- **Not an admin**: no screen; the app goes to `/projects`.
- No warning that the license is spent for good: the license line already says one is used.

### Início da obra - `/projects/:id`

The everyday entry into an obra. Its future content is the obra dashboard and the navigation into the site
(RF-801 unit map by status, RF-808 common-area strip, RF-804 indicators, RF-604 obra → torre → andar →
unidade → disciplina → planta). **Draw the frame and where that content goes; the dashboard itself, the map
and the navigation are designed with their epics (#6, #13)**, so a placeholder region is enough here.

- **Obra header**: back link "Obras" (to the list, previous URL kept), the obra name (h1, may wrap to two
  lines), the status badge (Em andamento / Entregue, same Badge as the list card), and the way into the
  configuração. Whether the header carries the role ("Gerente de obra" / "Assistente de obra"; nothing for the
  admin, as on the card) is the designer's call.
- **What #46 builds - the blank obra**: the obra has no structure yet, so the início is an empty state that
  sends people to configure it, for example: "A obra ainda não tem estrutura" · "Cadastre torres, andares e
  unidades para começar a mapear pendências." · "Configurar obra". Until the structure editor exists (#6),
  that action opens the configuração, where Dados da obra is the only section. Copy is the designer's call
  within the voice.
- **Delivered obra**: quieter, as on the list card; still opens and exports.
- **Loading**: real header frame with skeletons for the name and status, so nothing jumps.
- **Load error** and **offline**: the centered-block patterns of Obras (O9, O10).

### Configuração da obra - `/projects/:id/configuration`

Where the obra is set up. **Design the hub with every section in place**; RNF-02 asks for a denser desktop
for configuration. The obra header from the início stays, with a way back to the início.

| Section | What it holds | Requirements | Built in |
| --- | --- | --- | --- |
| **Dados da obra** | Name (rename), status (deliver / reopen) | RF-201, RF-217, RF-215, RF-216, ADR 0056 | **#46**: name and rename. Status: later ticket of the obra screen |
| Estrutura | Torres → andares → unidades, áreas comuns, cômodos, arquivados | RF-202 to RF-214, ADR 0030, 0036, 0041 | #6 (its own design session) |
| Equipe | Gerentes and assistentes on the obra, add by dropdown or e-mail invite | RF-126, RF-128, RF-129 | #11 |
| Disciplinas | The three default disciplines plus the obra's own | RF-401, RF-402, RF-404 | #8 |
| Empresas executoras | The contractors registered on the obra | RF-301 | #9 |

Show each future section as it will look **empty** (the obra is blank at creation), so the next design sessions
inherit the pattern. In the app, a section appears only when its epic ships.

**Dados da obra** in detail:

- Shows the name and the status.
- **Rename** (admin and gerente; the assistant sees the name read-only): the same validation and messages as
  Nova obra; saving shows the new name in the header without a reload. Interaction (inline edit, a field with
  Save, a sheet on mobile) is the designer's call. Failure: an Alert with the generic sentence, the typed
  name kept.
- **Status** (admin and gerente): "Marcar como entregue" / "Reabrir obra", with the consequence stated
  (RF-216: a delivered obra is frozen until reopened; reports still export). Not built in #46; design it.
- A delivered obra still accepts rename and reopen (ADR 0056: name and status are metadata).

### Página não encontrada

A centered block in the pattern of the Obras empty states, with the app header when there is a session:

| Case | Copy (icon is the designer's call) |
| --- | --- |
| Route that does not exist | "Página não encontrada" · "O endereço pode estar errado ou a página mudou de lugar." · "Voltar para obras" |
| Obra that does not exist or that the person cannot see | "Obra não encontrada" · "Ela não existe ou você não tem acesso a ela." · "Voltar para obras" |

Without a session the route guard already sends the person to `/login`; the not-found page is never the
answer to "not signed in".

---

## States to deliver

Each in light and dark, mobile (~390px) and desktop (1280px), frozen side by side in `Obra QA.dc.html`.
Ids are suggestions; keep them stable once drawn.

| Id | Screen | State |
| --- | --- | --- |
| N1 | Nova obra | Empty, licenses available ("Usa 1 das 5 licenças disponíveis.") |
| N2 | Nova obra | Last license ("Usa a última licença disponível.") |
| N3 | Nova obra | Client validation (empty, over 120) |
| N4 | Nova obra | Sending (spinner, locked) |
| N5 | Nova obra | No license on submit (Alert, name kept, button disabled) |
| N6 | Nova obra | Opened with no free license |
| N7 | Nova obra | Other failure (Alert, name kept) |
| N8 | Nova obra | License count loading |
| P1 | Início | Blank obra, just created (empty state → configurar) |
| P2 | Início | Delivered obra |
| P3 | Início | Loading |
| P4 | Início | Load error / offline |
| P5 | Início | Future frame with the dashboard and navigation regions (vision, not built) |
| C1 | Configuração | Right after creating: toast + Dados da obra (what #46 builds) |
| C2 | Configuração | Full hub, every section empty (vision) |
| C3 | Dados da obra | Renaming (editing, validation, saving, failure) |
| C4 | Dados da obra | Assistant: read-only |
| C5 | Dados da obra | Mark as delivered / reopen (confirmation) |
| C6 | Configuração | Delivered obra |
| X1 | Não encontrada | Route that does not exist |
| X2 | Não encontrada | Obra not found |

## What the API serves today vs. what is future

| Element | Status |
| --- | --- |
| `POST /api/projects` `{ name }` → `ProjectSummary`, `409 NO_FREE_LICENSE` | Served; gains the client-generated `id` (ADR 0068) in #46 |
| Available licenses `GET /api/organization/licenses` → `{ available }`, admin only | #46 |
| One obra `GET /api/projects/:id` (same visibility as the list, 404 otherwise) | #46 |
| Rename `PATCH /api/projects/:id` `{ name }`, admin or gerente | #46 |
| Deliver / reopen | Later ticket of the obra screen (ADR 0056) |
| Structure, team, disciplines, contractors | Their epics (#6, #11, #8, #9); no table migrated yet |
| Dashboard, unit map, navigation | #13, #6 |

`ProjectSummary` already carries id, name, status, createdAt, lastActivityAt and the caller's role.

## Copy (pt-BR, decided)

Nova obra · Obras · "Usa 1 das N licenças disponíveis." / "Usa a última licença disponível." · Nome da obra ·
Ex.: Casa Moinhos · Criar obra · Criando obra… · "Informe o nome da obra." · "O nome pode ter no máximo 120
caracteres." · "Sem licenças disponíveis. Fale com a BluPrint." · "Não foi possível criar a obra. Confira sua
conexão e tente de novo." · "Obra “Casa Moinhos” criada." · Página não encontrada · "O endereço pode estar
errado ou a página mudou de lugar." · Obra não encontrada · "Ela não existe ou você não tem acesso a ela." ·
Voltar para obras. The rest (início empty state, configuração headings, rename and status copy) is the
designer's, within the voice in the design system's readme and the glossary's words (*configuração da obra*,
*estrutura*, *equipe*, *disciplinas*, *empresas executoras*).

## Deliverables

- `Obra.dc.html`: the live screens with demo props (`theme`, `viewport`, `role`, `screen`, `state`,
  `licensesAvailable`).
- `Obra QA.dc.html`: N1–N8, P1–P5, C1–C6, X1–X2 frozen side by side.
- This README rewritten as the screen handoff, plus `HANDOFF.md` (the short version), in the format of
  `../obras/`: routes and files, layout rules, states, API served vs future, copy, components.
- Any primitive added to the design system with its states, recorded in `.claude/skills/bluprint-design/`.

## Out of scope

The structure editor and every other section editor (each epic's own design session, #6 first), the dashboard
and unit map (#13), plans and pins (#7), invitations (#11), the landing page, profile photo.
