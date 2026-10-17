# Handoff: Obra - Nova obra, tela da obra e página não encontrada (#46)

## Overview

Three screens close epic #5 and open the obra itself: **Nova obra** (`/projects/new`), the **tela da obra**
(início `/projects/:id` and configuração `/projects/:id/configuration`) and the **página não encontrada**.
The tela da obra is drawn as its whole vision; this document marks what #46 builds. Unidades follow the
reservation model: the construtora buys unidades, and every obra holds a **reserva** of them, set on Nova obra
and changed later by the admin in Dados da obra.

## Decided

| Topic | Decision |
| --- | --- |
| Where the form lives | Its own page, `/projects/new`, on mobile and desktop. Not a sheet, not a dialog. |
| After creating | Go to `/projects/:id/configuration` of the new obra, toast "Obra “Casa Moinhos” criada." |
| Two routes for the obra | `/projects/:id` = início (the everyday entry, later the dashboard and the navigation); `/projects/:id/configuration` = configuração. The list card opens the início; the list's "Nova obra" links to `/projects/new`. |
| Who configures | The admin and everyone on the obra, each within their role (ADR 0067, glossary term *Project configuration*). |
| Rename | RF-217: gerente de obra or admin rename the obra any time before delivery. The assistente does not. |
| Reserva on creation | Creating an obra spends nothing; it reserves unidades. "Unidades reservadas" is required on Nova obra, from 1 to the construtora's **livres** (livres = contratadas − the reservas of all obras). With 0 livres the page cannot create (N6). |
| Changing the reserva | Admin only, in Dados da obra, any time before delivery: from the obra's **usadas** (can be 0) to its reserva + the livres. Gerente and assistente read "Usa 250 de 400 reservadas" and never see the livres (ADR 0067). |
| On delivery | The unused part of the reserva goes back to the livres in the same transaction: the reserva becomes the usadas, and Dados da obra reads "Usou 380 unidades.". |
| Deliver (RF-215, RF-216) | Admin or gerente, after a confirmation dialog. Final: no reopen in the app, nothing on a delivered obra changes, its name included; only BluPrint support reopens one delivered by mistake (ADR 0069). Built in #168, not in #46. |
| Not enough livres | Recognized by the API's `409 NO_UNITS_LEFT` (`requested`, `available`); the page keeps the name and the number and puts the error on the "Unidades reservadas" field, like any other out-of-range value, with the server's `available` (N5). The admin's way out is "fale com a BluPrint" or lowering another obra's reserva. |
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
src/routes/_authenticated/$/route.tsx                            ← route 404 (X1), signed-out visitors go to /login first
src/routes/_authenticated/projects/new/route.tsx                 ← admin only; others redirect to /projects
src/routes/_authenticated/projects/$projectId/index.tsx          ← início
src/routes/_authenticated/projects/$projectId/configuration/route.tsx  ← configuração
src/features/projects/
  NewProjectPage/NewProjectPage.tsx
  ProjectPage/ProjectPage.tsx
  ProjectConfigurationPage/ProjectConfigurationPage.tsx, ProjectDetailsSection.tsx, RenameProjectForm.tsx
  components/ProjectScreen.tsx, ProjectHeader.tsx                ← shared by início and configuração
  ProjectsPage/NewProjectAction.tsx                              ← link to /projects/new
src/components/NotFound.tsx                                      ← both cases; route 404 and obra 404
```

The início renders X2 itself (`NotFound variant="project"`) for an id that is not a UUID, without calling the API, and on `404 PROJECT_NOT_FOUND`.

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
- No description under the title: the page carries no cost line.
- Field "Nome da obra", Input placeholder "Ex.: Casa Moinhos", `autoComplete="off"`, autofocus ≥ 768px only.
- Field "Unidades reservadas" right below it (same form gap, 16px), Input `inputMode="numeric"`,
  `autoComplete="off"`, no placeholder, full width; non-digits are dropped as they are typed. Help line under it
  (Field hint, 14px muted), live on every keystroke so the admin never does the math: empty or not yet valid
  "300 livres na construtora. Dá para ajustar depois." ("1 livre na construtora. …" for one); a valid number
  (1 to the livres) "300 livres na construtora. Depois de criar, sobram 225." (75 typed; 300 typed gives
  "sobram 0", 299 "sobra 1"). "Restam" names what is there before, "sobram" what is left after. While `GET /api/organization/units` loads (N8) the help line is a Skeleton 14px tall in the help
  line's own height (300px desktop, 80% mobile), so nothing moves when it arrives; the form already works. If
  that request fails the help line disappears and the field has no client-side maximum: the server's
  `NO_UNITS_LEFT` covers the real case.
- Validation on the client before sending, both fields at once, same rules as the API. Name: trimmed,
  1–120 characters. Unidades: empty (or 0 when the livres are unknown) "Informe quantas unidades reservar.";
  outside 1 to the livres "De 1 a 300 unidades.". The error is icon + text under the field and replaces the
  help line, never a red border alone. A repeated name is allowed and gets no warning.
- Button `lg` 52px, full width, "Criar obra". Sending: spinner + "Criando obra…", both fields disabled, submit
  ignored.
- Alert (danger, no title) at the top of the form for API failures that are not about a field (N7, N6).
  Editing either field clears it.
- **Someone reserved first (N5)**: `409 NO_UNITS_LEFT`. No Alert: the page stays, keeps name and number, and the
  "Unidades reservadas" field turns invalid with the error under it "Agora só restam 120 unidades livres. Ajuste
  a reserva e tente de novo." (the server's `available`), consistent with the out-of-range error N3d. The
  livres and the field's maximum become 120; once the number is edited the error clears and the help line comes
  back with 120 ("120 livres na construtora. Depois de criar, sobram 20." for 100). Resubmitting a number above
  120 gets the client error "De 1 a 120 unidades.".
- **0 livres (N6, N6b)**: both fields and the button disabled, no help line, and an Alert whose way out depends
  on `reclaimable` (unidades reserved by obras em andamento and not used by them). "Baixe a reserva de outra obra"
  appears only when there is something to lower: `reclaimable > 0` (N6) "Nenhuma unidade livre para uma obra nova.
  Baixe a reserva de outra obra ou fale com a BluPrint."; `reclaimable = 0`, no obra yet or every obra using its
  whole reserva (N6b) "Nenhuma unidade livre para uma obra nova. Fale com a BluPrint.". Normally unreachable,
  because the list disables "Nova obra" at 0 livres; it covers a direct URL or a stale list.
- States: see N1–N8 below.
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
- **P1c blank obra with the structure editor (#6)**: replaced by E1 in `../estrutura/`.
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

#### Dados da obra (#46: name and rename; 2.12: unidades)

The Card holds the name and the unidades; the status lives in its own card (below). Rows are separated by a
1px `--border` line with 16px above and below it.


- **Name row**: "Nome da obra" (14px muted) over the name (16px/500); right: outline "Renomear" with
  `pencil` 18px (admin and gerente only). Row wraps on narrow screens.
- **Editing**: the row becomes a form: optional danger Alert, Field "Nome da obra" (autofocus), then
  primary "Salvar" + outline "Cancelar" (each `flex: 1` on mobile, natural width on desktop). Validation and
  messages identical to Nova obra. Saving: "Salvando…" with spinner, field and Cancelar disabled. Success
  (`PATCH /api/projects/:id`): back to read mode, invalidate the project query so the header updates
  without reload. Failure: Alert "Não foi possível salvar o nome. Confira sua conexão e tente de novo.",
  draft kept. Escape or Cancelar discards.
- **Unidades row** (every role, right under the name row, also in C1 right after creating): "Unidades" (14px
  muted) over "Usa 250 de 400 reservadas" (16px/500; "Usa 0 de 200 reservadas" on a new obra). Admin only, on
  an obra em andamento: outline "Alterar reserva" with `sliders-horizontal` 18px on the right, the same
  treatment as "Renomear" (wraps under the text on narrow screens). Gerente (C4b) and assistente (C4) read it
  with no button and no lock line: the reserva is the admin's, like the livres it draws from.
- **Alterar reserva (C7)**: a plain dialog (`role="dialog"`, `aria-modal`), centered on desktop (max-width
  30rem, padding 24px, gap 20px, `--popover`, radius 14px, `--shadow-lg`, `--overlay` scrim) and the DS Sheet
  on mobile (footer buttons `lg` full width, primary on top), as the deliver dialog.
  - Title "Alterar reserva", and right under it (gap 4px; the Sheet's description on mobile) one 14px muted
    context line in plain words: "A obra usa 250 unidades. A construtora tem 150 livres.". No range sentence.
  - Field "Unidades reservadas", prefilled with the current reserva (400), `inputMode="numeric"`, autofocus, no
    hint.
  - Below the field (16px), two figure tiles side by side, the Unidades screen's figures made smaller
    (`../unidades/`): Card `sm`, padding 12px, label 14px muted, number Geist Mono 18px/600 tabular, then a 12px
    muted "Antes: 150" line. Tiles: "Restam na obra" (reserva − usadas) and "Livres na construtora" (livres +
    reserva atual − reserva nova). They update on every keystroke. The "Antes" line shows only while the typed
    value differs from the current reserva; its slot is always reserved, so the tiles never change height. Open
    (C7a): 150 / 150 without "Antes"; 450 typed (C7a2): 200 (Antes: 150) / 100 (Antes: 150). Grid
    `repeat(auto-fit, minmax(9.5rem, 1fr))`, gap 8px: side by side at 390 and on desktop, stacked only below that.
    `aria-live="polite"` on the group.
  - Validation timing as on Nova obra: the error appears under the field only when it loses focus or on Salvar
    (Enter in the field also validates, even with Salvar disabled): below the usadas "A obra já usa 250 unidades. A reserva não pode ficar abaixo disso." (C7b); above
    reserva + livres "Só há 150 unidades livres." (C7c). It clears as soon as the value becomes valid (a shown
    error follows the value while it stays invalid). While an invalid value is being typed nothing flashes: the
    tile whose value would be impossible shows "–" (never a negative number; Restam below the usadas, Livres
    above the livres) and Salvar stays disabled. An empty field shows no error, both tiles "–", Salvar disabled. Primary "Salvar" (submit) and
    outline "Cancelar".
  - Saving (C7d): "Salvando…" with spinner, field and Cancelar disabled; Escape and the scrim do nothing.
  - Success (C7e): the dialog closes, the row reads "Usa 250 de 450 reservadas", sonner success toast "Reserva de
    Casa Moinhos: 450 unidades.". Invalidate the project and the organization units queries.
  - Server refusals keep the dialog and the typed number and show the same field errors with the server's
    numbers: `409 RESERVATION_BELOW_USED` (`used`) as C7b, `409 NO_UNITS_LEFT` (`available`) as C7c.
    `409 PROJECT_DELIVERED` closes the dialog and refetches the obra (it now reads as C6). A network failure
    follows the rename pattern: danger Alert above the field, number kept (copy to review: "Não foi possível
    salvar a reserva. Confira sua conexão e tente de novo.").
- **Assistente (C4)**: no Renomear; footer line with `lock` 16px: "Só o gerente de obra ou o admin da
  construtora renomeia a obra."
- **Delivered (C6)**: no Renomear and no Alterar reserva for anyone; the unidades row reads "Usou 380 unidades."
  (the reserva became the usadas on delivery); `lock` line "A obra foi entregue: o nome e a reserva não podem
  mais ser alterados."

#### Status da obra (#168; not in #46)

Delivering is final: a delivered obra is closed for good and is never reopened, and the unused part of its
reserva goes back to the livres ([0069](../../../adr/0069-delivering-a-project-is-final.md), RF-215 to RF-217). Its own Card right after Dados da obra, because it changes the whole obra, not a field
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
    disponíveis para exportar." The reserva is not mentioned: delivery returns its unused part to the livres on
    its own, and the delivery ticket owns any wording about it.
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
| Estrutura | RF-202 to RF-214 | #6, replaced by the sections in `../estrutura/` |
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
| Nova obra | Creates, reserving 1 to the livres | Redirected to `/projects` | Redirected to `/projects` |
| Início da obra | Any obra, through the organization (ADR 0067); later reads and exports, never records pins (ADR 0024) | Their obras | Their obras |
| Dados da obra: rename (not on a delivered obra) | Yes | Yes | Reads only (RF-217) |
| Dados da obra: reserva (not on a delivered obra) | Reads "Usa N de M reservadas"; changes it (2.12) | Reads only | Reads only |
| Status da obra: deliver, final (#168) | Yes | Yes | Reads only |
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
| N1 | Nova obra | Empty, help "300 livres na construtora. Dá para ajustar depois." |
| N1b | Nova obra | 75 typed: "300 livres na construtora. Depois de criar, sobram 225." (live) |
| N3a / N3b | Nova obra | "Informe o nome da obra." / "O nome pode ter no máximo 120 caracteres." (unidades filled) |
| N3c / N3d | Nova obra | "Informe quantas unidades reservar." / "De 1 a 300 unidades." |
| N4 | Nova obra | Sending |
| N5 | Nova obra | Someone reserved first: `NO_UNITS_LEFT` as a field error, values kept, maximum now 120 |
| N6 / N6b | Nova obra | 0 livres: fields and button disabled; Alert with "Baixe a reserva de outra obra" only when `reclaimable > 0` (N6), otherwise "Fale com a BluPrint." (N6b) |
| N7 | Nova obra | Other failure |
| N8 | Nova obra | Livres loading: help line skeleton |
| P1 / P1b | Início | Blank obra, admin / gerente (#46: no button) |
| P1c | Início | Blank obra with the structure editor (vision, #6) |
| P2 | Início | Delivered |
| P3 | Início | Loading |
| P4a / P4b | Início | Error / offline |
| P5 | Início | Vision |
| C1 | Configuração | Right after creating (toast); Dados da obra only, "Usa 0 de 200 reservadas" |
| C2 / C2b | Configuração | Full hub, admin / assistente (vision; future sections are frames) |
| C3a–d | Dados da obra | Editing / validation / saving / failure |
| C4 | Dados da obra | Assistente: no rename, unidades read-only |
| C4b | Dados da obra | Gerente: renames, unidades read-only |
| C5a / C5b / C5c | Status da obra | Deliver dialog / sending / failure |
| C6 | Configuração | Delivered: closed, nothing editable, "Usou 380 unidades." |
| C7a / C7a2 | Dados da obra | Alterar reserva (admin): open with 400, tiles 150 / 150 / 450 typed, tiles 200 / 100 with "Antes: 150" |
| C7b–e | Dados da obra | Alterar reserva: below the usadas (Restam "–") / above the livres (Livres "–") / saving / saved (toast) |
| X1 / X2 | Não encontrada | Route / obra |

## State management

- `useOrganizationUnitsQuery()` → `{ contracted, reserved, free, reclaimable }` (admin only; Nova obra reads
  `free`, and `reclaimable` for the N6 / N6b wording; the dialog reads `free`).
  `useCreateProjectMutation` sends `{ id, name, units }` with `id = crypto.randomUUID()` generated once when the
  page mounts (kept across retries). On `error.problem.code === "NO_UNITS_LEFT"` set the query's `free` to
  `problem.available` and the field error (N5). The "sobram" help is derived from `free` and the typed value. Success invalidates the units query and the list.
- `projectQueryOptions(id)` shared by início and configuração; `404 PROJECT_NOT_FOUND` is not retried and renders X2.
- `useRenameProjectMutation` → `setQueryData` on the project and invalidate the list.
- `useChangeReservationMutation` (2.12) sends `{ reserved }`; success → `setQueryData` on the project's `units`,
  invalidate the organization units query and the list. Branch on `RESERVATION_BELOW_USED`, `NO_UNITS_LEFT` and
  `PROJECT_DELIVERED`. Local UI state: draft + error.
  The dialog's open state lives in the address, `/projects/:id/configuration?reserva=alterar`, so the "Alterar
  reserva" links of the structure screens (W4c, F5b, R9b) reach it and Back closes it.
- `useDeliverProjectMutation` (#168) → `setQueryData` on the project, invalidate the organization units query and
  the list; `PROJECT_DELIVERED` (stale tab) reloads the project and the organization units. Local UI state: rename
  editing + draft, deliver dialog open + checkbox.

## What the API serves today vs. future

| Element | Status |
| --- | --- |
| `POST /api/projects` `{ id, name, units }` → `ProjectSummary`; `409 NO_UNITS_LEFT` with `requested` and `available`; `PROJECT_ID_TAKEN` and the idempotent retry (ADR 0068) | Served, including `id`, `PROJECT_ID_TAKEN` and the idempotent retry; the page is built (#151) |
| Livres `GET /api/organization/units` → `{ contracted, reserved, free, reclaimable }`, admin only (403 for everyone else). `reclaimable` = sum over obras em andamento of reserva − usadas, what lowering other reservas could free | Served |
| The obra summary (`GET /api/projects`, `GET /api/projects/:id`) gains `units: { reserved, used }` | Served on `GET /api/projects`, `GET /api/projects/:id` and the create response; `used` counts the units in the obra's structure |
| Alterar reserva `PATCH /api/projects/:id/units` `{ reserved }`, admin only; `409 RESERVATION_BELOW_USED` with `used`, `409 NO_UNITS_LEFT` with `requested` and `available`, `409 PROJECT_DELIVERED` | Served |
| One obra `GET /api/projects/:id` (same visibility as the list, `404 PROJECT_NOT_FOUND` otherwise) | Served |
| Rename `PATCH /api/projects/:id` `{ name }`, admin or gerente (`403` for the assistente); `409 PROJECT_DELIVERED` on a delivered obra | Served |
| Deliver `POST /api/projects/:id/delivery`, admin or gerente; final, no reopen route (ADR 0069); `409 PROJECT_DELIVERED` when already delivered; the summary gains `delivery: { at, by } \| null` | Served |
| Structure, team, disciplines, contractors | Their epics (#6, #11, #8, #9); no table migrated yet |
| Dashboard, unit map, navigation | #13, #6 |

`ProjectSummary` carries id, name, status, createdAt, lastActivityAt, the caller's role, the units and, once the obra
is delivered, `delivery: { at, by }` (when, and the name of who delivered), which the delivered line "Entregue em … por …" reads.

## Components and assets

Alert, Avatar, Badge, Button, Card, DropdownMenu, Field, Icon, Input, Logo, SegmentedControl, Skeleton,
Toast (sonner), Checkbox, Sheet. The unidades row uses the existing `sliders-horizontal` glyph. New in the design system for this screen: **AlertDialog**
(`components/overlay/AlertDialog.*`, shadcn `alert-dialog`), the `--badge-primary` tokens that lift the
"Em andamento" badge in dark mode, and six lucide glyphs: `settings`, `pencil`, `layers`, `users`, `wrench`,
`map-pin-off`. `_ds_bundle.js` carries them; the prototype draws the dialog inline. In the app the glyphs come from
`lucide-react`. The status badge uses the existing `success` tone for "Entregue" (`apps/web` gains the
variant).

## Open points

1. Not-admin on `/projects/new` redirects silently; no screen.
2. Until #11 ships, nothing links a gerente or assistente to an obra (only the seed does), so P1b, C3 as gerente,
   C4 and C2b are reachable in the app only after #11; #46's tests cover them through seeded memberships.
