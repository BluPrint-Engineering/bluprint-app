# Handoff: Obra - Nova obra, tela da obra e página não encontrada (#46)

## Overview

Three screens close epic #5 and open the obra itself: **Nova obra** (`/projects/new`), the **tela da obra**
(início `/projects/:id` and configuração `/projects/:id/configuration`) and the **página não encontrada**.
The tela da obra is drawn as its whole vision; this document marks what #46 builds.

## Decided

| Topic | Decision |
| --- | --- |
| Where the form lives | Its own page, `/projects/new`, on mobile and desktop. Not a sheet, not a dialog. |
| After creating | Go to `/projects/:id/configuration` of the new obra, toast "Obra “Casa Moinhos” criada." |
| Two routes for the obra | `/projects/:id` = início (the everyday entry, later the dashboard and the navigation); `/projects/:id/configuration` = configuração. The list card opens the início; the list's "Nova obra" links to `/projects/new`. |
| Who configures | The admin and everyone on the obra, each within their role (ADR 0067, glossary term *Project configuration*). |
| Rename | RF-217: gerente de obra or admin rename the obra any time before delivery. The assistente does not. Renaming never frees the license. |
| Deliver (RF-215, RF-216) | Admin or gerente, after a confirmation dialog. Final: no reopen in the app, nothing on a delivered obra changes, its name included; only BluPrint support reopens one delivered by mistake (ADR 0069). Built in a later ticket of the obra screen, not in #46. |
| No license | Recognized by the API's `NO_FREE_LICENSE` code; the sentence is always "Sem licenças disponíveis. Fale com a BluPrint." |
| Retry is safe | The page generates the obra id when it opens; resending answers the obra already created, never a second one (ADR 0068). |
| Hidden, not faked | Sections whose epic is not built are **not shown** in the app, never "em breve". The design shows them all; this handoff marks which ship with #46. |
| Not found | Two cases: a route that does not exist, and an obra that does not exist or the person cannot see (the API answers 404 for both, to reveal nothing). Without a session the route guard sends the person to `/login`; the not-found page is never the answer to "not signed in". |

## About the design files

`Obra.dc.html` and `Obra QA.dc.html` are **HTML design references** that load the design system from
`.claude/skills/bluprint-design/`. Recreate them in `apps/web` with the existing stack (TanStack Router +
Query, Tailwind v4, shadcn radix-nova, `lucide-react`); do not copy the prototype code. Serve the repo root
(`bunx serve .`) and open `docs/design/screens/obra/Obra.dc.html`. **Fidelity: high.**

## Route and files in `apps/web`

```
src/routes/__root.tsx                                            ← notFoundComponent
src/routes/_authenticated/projects/new.tsx                       ← admin only; others redirect to /projects
src/routes/_authenticated/projects/$projectId/index.tsx          ← início
src/routes/_authenticated/projects/$projectId/configuration.tsx  ← configuração
src/features/projects/
  NewProjectPage/NewProjectPage.tsx
  ProjectPage/ProjectPage.tsx, ProjectHeader.tsx                 ← ProjectHeader climbs once configuração uses it
  ProjectConfigurationPage/ProjectConfigurationPage.tsx, ProjectDetailsSection.tsx
  ProjectsPage/NewProjectAction.tsx                              ← link to /projects/new
src/components/NotFound.tsx                                      ← both cases; route 404 and obra 404
```

`$projectId` loaders: on API 404 throw `notFound()` with the "obra" variant so the root renders X2.

---

## Screens

Breakpoint **768px**. App header (logo + user menu) exactly as on Obras: 56px mobile, 64px sticky desktop.

### Nova obra

- Column `max-width: var(--content-max)` (26rem), centered. Padding mobile `8px 16px 40px`, desktop
  `32px 32px 48px`. Gap between back link and form 8px mobile, 12px desktop.
- **Back link** "Obras": `chevron-left` 20px + text 14px/500 `--muted-foreground` (hover `--foreground`),
  44px tall, pulled 6px left so the glyph aligns with the content edge. Goes to `/projects` with the list's
  previous search params.
- **Desktop**: Card (gap 20px). **Mobile**: same content flat (no ring, transparent, no inline padding).
- Title "Nova obra" as h1, 28px/600, tracking -0.02em, leading 1.15.
- License line (CardDescription, 14px muted): "Usa 1 das N licenças disponíveis." / "Usa a última licença
  disponível." / no license: "Sem licenças disponíveis. Fale com a BluPrint.". Loading: Skeleton 220 × 16.
  Count failed: line hidden.
- Field "Nome da obra", Input placeholder "Ex.: Casa Moinhos", `autoComplete="off"`, autofocus ≥ 768px only.
- Validation on the client before sending, same rules as the API (trimmed, 1–120 characters); the error is
  icon + text under the field, never a red border alone. A repeated name is allowed and gets no warning.
- Button `lg` 52px, full width, "Criar obra". Sending: spinner + "Criando obra…", field disabled, submit
  ignored.
- Alert (danger, no title) at the top of the form for API failures.
- States: see N1–N8 below. In N5 the field stays enabled with the name kept, the button is disabled. In N6
  field and button are disabled.
- Success: `navigate({ to: "/projects/$projectId/configuration" })` + sonner success toast
  "Obra “Casa Moinhos” criada.".

### Obra header (início and configuração)

- Band under the app header: `border-bottom: 1px solid --border`; inner max-width 72rem; padding mobile
  `4px 16px 20px`, desktop `16px 32px 24px`; gap 8px.
- Row 1 (44px): back link (same style as Nova obra) - "Obras" on the início, "Início da obra" on the
  configuração. Mobile início only: outline icon button 44px with `settings` 20px on the right,
  `aria-label="Configuração da obra"`.
- Row 2 (flex, wraps, `align-items: flex-end`): left block, gap 8px:
  - h1 obra name: 28px mobile / 36px desktop, 600, tracking -0.02em, leading 1.15, `text-wrap: balance`,
    `overflow-wrap: anywhere`, no clamp (wraps to as many lines as needed).
  - Meta row, gap 12px: status Badge (`primary` with dot "Em andamento" / `success` with `circle-check` icon
    "Entregue", so a delivered obra reads as concluded, not just grayed out) + role for gerente
    / assistente ("Gerente de obra" / "Assistente de obra", 14px muted). Admin: badge only.
  - Desktop início only, right: outline `md` "Configuração da obra" with `settings`.
- Loading: the band keeps its frame; name = Skeleton (360 × 36 desktop, 70% × 28 mobile), badge = Skeleton
  116 × 24 pill.
- Error / offline: band shows the back link only.

### Início - `/projects/:id`

Main: max-width 72rem, padding mobile `20px 16px 32px`, desktop `32px 32px 48px`.

- **P1 blank obra (#46)**: centered block, Obras pattern (26rem, gap 16px, padding-block 48 / 64px):
  `layers` 24px muted · "A obra ainda não tem estrutura" (18px/600) · "As pendências aparecem aqui quando a
  obra tiver estrutura." (14px muted). No button: nothing in #46 adds structure, and the header already
  leads to the configuração.
- **P1c blank obra with the structure editor (vision, #6)**: same block, "Cadastre torres, andares e unidades
  para começar a mapear pendências." · primary `lg` "Cadastrar estrutura" (full width on mobile) → the
  structure editor. Not a decision: the #6 refinement sets its copy and destination.
- **P2 delivered**: only the header is decided here (badge "Entregue"). The rest of the início of a delivered obra
  is the dashboard and navigation of #13 and #6, not refined yet, so the prototype shows the P5 frame.
- **P3 loading**: header skeletons + a skeleton block (24 circle, 240 × 20, 300 × 14) where the empty state
  will land.
- **P4 error**: `circle-alert` · "Não foi possível carregar a obra" · "Confira sua conexão e tente de novo." ·
  `lg` "Tentar de novo", `role="alert"`. **Offline**: `wifi-off` · "Sem conexão." · "Continuamos assim que a
  internet voltar.", no button, resumes on `online`.
- **P5 vision (not built)**: 4-column grid desktop / 1 column mobile, gap 12px, dashed `--input` regions,
  radius 14px: Indicadores (RF-804, full width), Mapa de unidades por status (RF-801, 3 cols), Navegação da
  obra (RF-604, 1 col), Áreas comuns (RF-808, full width). Placeholders only; each is designed with #6 / #13.
  When structure exists, the P1 empty state is replaced by this content.

### Configuração - `/projects/:id/configuration`

- Same header band (back link "Início da obra", no configure button). The logo in the app header returns
  to `/projects`.
- h2 "Configuração", 22px/600.
- Dados da obra is a Card; future sections are dashed frames (below). Gap 16px, column max-width 48rem. Section title (CardTitle as heading level 3)
  18px/600.
- **Desktop with more than one section shipped**: grid `200px minmax(0,1fr)`, gap 32px; left a sticky
  (`top: 88px`) nav of 44px links, icon 18px + label 14px/500 muted; current = `--accent` bg +
  `--accent-foreground`; hover `--muted`. Links jump to the section (`scroll-margin-top: 88px`). With only
  Dados da obra (#46) the nav is not rendered.

#### Dados da obra (#46: name and rename)

The Card holds the name only; the status lives in its own card (below).


- **Name row**: "Nome da obra" (14px muted) over the name (16px/500); right: outline "Renomear" with
  `pencil` 18px (admin and gerente only). Row wraps on narrow screens.
- **Editing**: the row becomes a form: optional danger Alert, Field "Nome da obra" (autofocus), then
  primary "Salvar" + outline "Cancelar" (each `flex: 1` on mobile, natural width on desktop). Validation and
  messages identical to Nova obra. Saving: "Salvando…" with spinner, field and Cancelar disabled. Success
  (`PATCH /api/projects/:id`): back to read mode, invalidate the project query so the header updates
  without reload. Failure: Alert "Não foi possível salvar o nome. Confira sua conexão e tente de novo.",
  draft kept. Escape or Cancelar discards.
- **Assistente (C4)**: no Renomear; footer line with `lock` 16px: "Só o gerente de obra ou o admin da
  construtora renomeia a obra."
- **Delivered (C6)**: no Renomear for anyone; `lock` line "A obra foi entregue: o nome não pode mais ser alterado."

#### Status da obra (later ticket of the obra screen; not in #46)

Delivering is final: a delivered obra is closed for good and is never reopened, so the license it holds is
really spent ([0069](../../../adr/0069-delivering-a-project-is-final.md), RF-215 to RF-217). Its own Card right after Dados da obra, because it changes the whole obra, not a field
of it. #46 does not render it: the header badge already shows the status.

- **Body**: status Badge, then 14px muted text. Em andamento: "A equipe registra e resolve pendências. Entregue a
  obra quando ela for passada ao cliente: depois disso ela fica fechada e não pode ser reaberta." Entregue:
  "Entregue em 14/10/2026 por Rafael Souza. A obra está fechada: nada mais pode ser alterado. Os relatórios
  continuam disponíveis." (needs who and when the obra was delivered; see "What the API serves").
- **Action** (admin and gerente, active obra only): outline Button with `circle-check` 18px "Entregar obra",
  right of the text, wrapping under it on narrow screens. Not `secondary`: in dark mode its fill (#16263D)
  nearly disappears on the card (#0E2340). Not primary: it is rare and should not be the loudest thing on the
  page. No action on a delivered obra.
- **Confirmation (C5)**: an AlertDialog (`.claude/skills/bluprint-design/components/overlay/AlertDialog.*`), centered on
  desktop (max-width 30rem, padding 24px, `--popover`, radius 14px, `--shadow-lg`, `--overlay` scrim) and the
  DS Sheet on mobile (footer buttons `lg` full width, primary on top).
  - Title "Entregar “Casa Moinhos”?". Text "A entrega fecha a obra de vez. Depois de confirmar:" then three lines
    with an 18px muted icon: `lock` "Ninguém mais cria, altera ou exclui pins, fotos, plantas, estrutura, equipe,
    disciplinas, empresas executoras ou o nome da obra: nada mais na obra muda." · `x` "A obra não pode ser reaberta." · `circle-check` "Os relatórios continuam
    disponíveis para exportar." The license is not mentioned: creating the obra already said one is spent.
  - Checkbox "Entendi que a obra não poderá ser reaberta." The primary `circle-check` "Entregar obra" stays
    disabled until it is checked: one deliberate step more than a click, without typing the obra name (names
    run to 120 characters and this happens on phones too).
  - Cancelar (outline), Escape and the scrim close it; none of them works while sending. Focus starts on the
    checkbox.
  - Sending: "Entregando obra…" with spinner, checkbox and Cancelar disabled (C5b). Failure (C5c): danger Alert
    `role="alert"` "Não foi possível entregar a obra. Confira sua conexão e tente de novo." right above the
    buttons, under the checkbox (kept checked): next to the action that failed, and the title and the
    consequences do not move.
  - Success: dialog closes, the obra turns delivered everywhere (header badge, Dados da obra, Status da obra),
    sonner success toast "Obra “Casa Moinhos” entregue.".
- **Assistente**: badge and text, no action; `lock` line "Só o gerente de obra ou o admin da construtora entrega
  a obra."
- Side nav (vision): "Status da obra" with `circle-check`, after Dados da obra.

#### Future sections (vision; hidden until their epic ships)

Each future section is only a frame: a dashed region (`--input`, radius 14px, padding 16px, min-height 120px)
with the section name (16px/600, heading level 3), its requirements and epic in mono muted text, and
"Conteúdo e forma decididos no refinamento do #N.". No empty state, no action, no content: what each section
holds, who acts on it and how it looks are decided by that epic's own refinement, which may also redesign the
hub itself (the side nav and the stacked sections are the #46 frame, not a constraint).

| Section | Requirements | Epic |
| --- | --- | --- |
| Estrutura | RF-202 to RF-214 | #6 |
| Equipe | RF-126, RF-128, RF-129 | #11 |
| Disciplinas | RF-401, RF-402, RF-404 | #8 |
| Empresas executoras | RF-301 | #9 |

### Página não encontrada

App header when signed in, then the centered block with an h1 and primary `lg` "Voltar para obras" (full
width on mobile) → `/projects`.

- X1 route: `map-pin-off` · "Página não encontrada" · "O endereço pode estar errado ou a página mudou de lugar."
- X2 obra: `building` · "Obra não encontrada" · "Ela não existe ou você não tem acesso a ela."

---

## Who does what

| Screen / section | Admin da construtora | Gerente de obra | Assistente de obra |
| --- | --- | --- | --- |
| Lista de obras | Every obra of the organization; "Nova obra" | Only the obras they are on | Only the obras they are on |
| Nova obra | Creates, using one license | Redirected to `/projects` | Redirected to `/projects` |
| Início da obra | Any obra, through the organization (ADR 0067); later reads and exports, never records pins (ADR 0024) | Their obras | Their obras |
| Dados da obra: rename (not on a delivered obra) | Yes | Yes | Reads only (RF-217) |
| Status da obra: deliver, final (later ticket) | Yes | Yes | Reads only |
| Estrutura (#6) | Creates and edits; restores and deletes archived items | Same as admin | Creates and edits (RF-205); no restore or permanent delete (RF-212, RF-214) |
| Equipe (#11) | Invites gerentes and assistentes (ADR 0070) | Invites assistentes | Invites nobody (RF-126, ADR 0023) |
| Disciplinas (#8) | Creates extra disciplines | Same | Same (RF-402) |
| Empresas executoras (#9) | RF-301 does not say who; #9 decides | | |
| Delivered obra | Reads and exports only | Reads and exports only | Reads and exports only |
| Not found | Same page for everyone; an obra the person cannot see answers 404, not 403 | | |

A platform admin sees none of these screens' content (ADR 0021). Until #11, only the admin reaches an obra outside the seed (open point 3).

## States

| Id | Screen | State |
| --- | --- | --- |
| N1 | Nova obra | Empty, "Usa 1 das 5 licenças disponíveis." |
| N2 | Nova obra | "Usa a última licença disponível." |
| N3a / N3b | Nova obra | "Informe o nome da obra." / "O nome pode ter no máximo 120 caracteres." |
| N4 | Nova obra | Sending |
| N5 | Nova obra | No license on submit |
| N6 | Nova obra | Opened with no free license |
| N7 | Nova obra | Other failure |
| N8 | Nova obra | License count loading |
| P1 / P1b | Início | Blank obra, admin / gerente (#46: no button) |
| P1c | Início | Blank obra with the structure editor (vision, #6) |
| P2 | Início | Delivered |
| P3 | Início | Loading |
| P4a / P4b | Início | Error / offline |
| P5 | Início | Vision |
| C1 | Configuração | Right after creating (toast); Dados da obra only |
| C2 / C2b | Configuração | Full hub, admin / assistente (vision; future sections are frames) |
| C3a–d | Dados da obra | Editing / validation / saving / failure |
| C4 | Dados da obra | Assistente: no rename |
| C5a / C5b / C5c | Status da obra | Deliver dialog / sending / failure |
| C6 | Configuração | Delivered: closed, nothing editable |
| X1 / X2 | Não encontrada | Route / obra |

## State management

- `useOrganizationLicensesQuery()` → `{ available }` (admin only). `useCreateProjectMutation` sends
  `{ id, name }` with `id = crypto.randomUUID()` generated once when the page mounts (kept across retries).
  Branch on `error.problem.code === "NO_FREE_LICENSE"`.
- `useProjectQuery(id)` shared by início and configuração; 404 → `notFound()`.
- `useRenameProjectMutation` → `setQueryData` on the project and invalidate the list.
- `useDeliverProjectMutation` (later ticket) → updates the project and the list. Local UI state: rename editing +
  draft, deliver dialog open + checkbox.

## What the API serves today vs. future

| Element | Status |
| --- | --- |
| `POST /api/projects` `{ name }` → `ProjectSummary`, `409 NO_FREE_LICENSE` | Served; gains the client-generated `id` (ADR 0068) in #46 |
| Available licenses `GET /api/organization/licenses` → `{ available }`, admin only | #46 |
| One obra `GET /api/projects/:id` (same visibility as the list, 404 otherwise) | #46 |
| Rename `PATCH /api/projects/:id` `{ name }`, admin or gerente; refused on a delivered obra | #46 |
| Deliver, admin or gerente; final, no reopen route (ADR 0069) | Later ticket of the obra screen |
| Structure, team, disciplines, contractors | Their epics (#6, #11, #8, #9); no table migrated yet |
| Dashboard, unit map, navigation | #13, #6 |

`ProjectSummary` already carries id, name, status, createdAt, lastActivityAt and the caller's role. The
delivered line "Entregue em … por …" needs who and when the obra was delivered, which `project` does not store
today (`status` only).

## Components and assets

Alert, Avatar, Badge, Button, Card, DropdownMenu, Field, Icon, Input, Logo, SegmentedControl, Skeleton,
Toast (sonner), Checkbox, Sheet. New in the design system for this screen: **AlertDialog**
(`components/overlay/AlertDialog.*`, shadcn `alert-dialog`), the `--badge-primary` tokens that lift the
"Em andamento" badge in dark mode, and six lucide glyphs: `settings`, `pencil`, `layers`, `users`, `wrench`,
`map-pin-off`. `_ds_bundle.js` is generated and does not carry them yet, so until it is rebuilt the prototype
draws the dialog inline and loads the glyphs from `icons/` with `Icon basePath`. In the app they come from
`lucide-react`. The status badge uses the existing `success` tone for "Entregue" (`apps/web` gains the
variant).

## Open points

1. Delivery records who delivered and when ([0069](../../../adr/0069-delivering-a-project-is-final.md));
   `project` has no such columns yet, so the ticket that builds delivery adds them.
2. Not-admin on `/projects/new` redirects silently; no screen.
3. Until #11 ships, nothing links a gerente or assistente to an obra (only the seed does), so P1b, C3 as gerente,
   C4 and C2b are reachable in the app only after #11; #46's tests cover them through seeded memberships.
