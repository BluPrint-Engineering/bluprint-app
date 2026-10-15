# Handoff: Estrutura da obra (#6)

## Overview

The structure of an obra (towers, floors, units, common areas and their rooms) is **edited where it is navigated**:
there is no separate editor. The início da obra lists the towers, a tower reads as its **façade** (one row per floor,
units and common areas as tappable blocks), and every level carries "Adicionar" and a menu per item. A whole obra is
set up at once by the **assistente** ("Montar estrutura"), which creates every tower with its own floors, units per
floor, halls, common areas and **tipologias** (unit types, applied by stack and floor range), with a preview before
anything is saved. The configuração da obra summarises the structure and holds the **Tipologias** and **Arquivados**
sections.

Product decisions come from the #6 refinement (Q1 to Q12) and are recorded in ADR 0071 (edited where navigated,
façade, wizard, names), ADR 0072 (unit type linked, units keep their changes) and ADR 0073 (one "Remover"; content
decides delete or archive), plus RF-205, RF-207 and RF-209 and the glossary terms *Tower*, *Floor*, *Stack*,
*Unit type*, *Location content* and *Archived*. They are not repeated here.

## About the design files

`Estrutura.dc.html` and `Estrutura QA.dc.html` are **HTML design references** that load the design system from
`.claude/skills/bluprint-design/`. Recreate them in `apps/web` with the existing stack (TanStack Router + Query,
Tailwind v4, shadcn radix-nova, `lucide-react`); do not copy the prototype code. Serve the repo root (`bunx serve .`)
and open `docs/design/screens/estrutura/Estrutura.dc.html`; demo props also read from the URL
(`?screen=tower&role=assistant&theme=dark`).
**Fidelity: high.**

| File | What it is |
| --- | --- |
| `Estrutura.dc.html` | Live screens. Demo props: `theme`, `viewport`, `role` (admin / manager / assistant), `structure` (multi / single / empty), `screen` (home / tower / floor / unit / area / wizard / configuration), `state`, `delivered`, `createResult`, `removeResult` |
| `Estrutura QA.dc.html` | The 44 states below frozen, mobile 390 × 844 and desktop 1280 × 800, light and dark |
| `icons/` | Lucide glyphs the generated `_ds_bundle.js` does not carry yet |

The prototype re-evaluates `_ds_bundle.js` once after mounting when the bundle recorded `React is not defined`
errors (Alert, Toast and DropdownMenu evaluate JSX at module load, and the bundle can load before React). That is a
prototype workaround, not app behavior.

## Routes and files in `apps/web`

```
src/routes/_authenticated/projects/$projectId/index.tsx                     ← início: towers, or the façade of a single tower
src/routes/_authenticated/projects/$projectId/locations/$locationId.tsx     ← tower, floor, unit or common area
src/routes/_authenticated/projects/$projectId/structure/new.tsx             ← assistente (?tower=<id> to add floors)
src/routes/_authenticated/projects/$projectId/configuration.tsx             ← gains Estrutura, Tipologias, Arquivados
src/features/structure/
  ProjectStructure/TowerCards.tsx, Facade.tsx, CommonAreaList.tsx            ← Facade climbs to components/ when #13 reuses it
  LocationPage/LocationPage.tsx, TowerBody.tsx, FloorBody.tsx, UnitBody.tsx, RoomList.tsx
  StructureWizard/StructureWizard.tsx, TowersStep.tsx, CommonAreasStep.tsx, UnitTypesStep.tsx, Preview.tsx
  configuration/StructureSection.tsx, UnitTypesSection.tsx, ArchivedSection.tsx
  RemoveLocationDialog.tsx, RenameDialog.tsx, ChangeUnitTypeDialog.tsx
```

One route for every location kind: the API answers the location with its kind, ancestors and children, and the page
picks the body. A location the person cannot see, deleted or archived answers 404 and renders T5 (not the generic
not-found page, so the way back is the obra).

---

## Screens

Breakpoint **768px**. App header and the obra header band exactly as in `../obra/` (56px / 64px header; band with
back link, h1 28 / 36px, meta row). Main column max-width 72rem, padding mobile `20px 16px 32px`, desktop
`32px 32px 48px`.

### Band of a location (torre, andar, unidade, área comum)

- Back link to the parent: "Casa Moinhos" from a tower, "Torre A" from a floor, "9º andar" from a unit. With a single
  tower, the tower is skipped: a floor goes back to the obra.
- h1 = the location's name; a unit's name in **Geist Mono** (it is a number).
- Meta line, 14px muted, separated by " · ": kind, where it is, counts. `Torre · 13 andares · 48 unidades`,
  `Andar · Torre A · 4 unidades`, `Unidade · Torre A · 9º andar`, `Área comum · Torre A · Térreo` /
  `Área comum · da obra`. The tower name drops out of every line when there is a single tower.
- Actions: mobile, a 44px outline icon button with `ellipsis` on the back-link row opens the page menu. Desktop, right
  of the title: outline "Adicionar andares" (`list-plus`) on a tower, then the same 44px `ellipsis` menu button.
- Delivered obra: no actions; under the meta line, `lock` 16px + "A obra foi entregue: a estrutura não pode mais ser
  alterada."

### Menus (DropdownMenu, width 240, align end)

| Item | Torre | Andar | Unidade | Área comum |
| --- | --- | --- | --- | --- |
| Renomear (`pencil`) | Renomear torre | Renomear andar | Renomear | Renomear |
| Adicionar andares (`list-plus`) | yes | | | |
| Adicionar área comum (`plus`) | yes | | | |
| Mover para cima / baixo (`arrow-up`, `arrow-down`) | | yes | yes | |
| Duplicar (`copy`) | Duplicar torre | Duplicar andar | Duplicar unidade | |
| separator, then Remover (`trash-2`, text `--destructive`) | Remover torre | Remover andar | Remover unidade | Remover área comum |

A destructive menu item is the DropdownMenuItem `destructive` variant.

### Início - `/projects/:id`

- **E1 no structure**: the centered empty block of `../obra/` P1 (48px muted circle with `layers` 24px, 18px/600 title,
  14px muted text, gap 16px, padding-block 48 / 64px): "A obra ainda não tem estrutura" · "Monte torres, andares,
  unidades e áreas comuns de uma vez. Depois, tudo se ajusta na fachada." · primary `lg` "Montar estrutura"
  (`list-plus`, full width on mobile) → assistente · ghost "Adicionar uma torre por vez". Replaces P1/P1c of the
  obra handoff. When nobody can edit (delivered), the text says "A estrutura aparece aqui quando alguém da equipe
  montar a obra." and there is no button.
- **E2 several towers**: section "Torres" (h2 18px/600) with outline "Adicionar" (`plus`; `sm` on mobile) opening a
  menu: Torre (`building-2`), Área comum da obra (`plus`), separator, Montar com o assistente (`list-plus`). Tower
  cards: grid 3 columns desktop / 1 mobile, gap 12px; each card is a button, padding 20px, radius 14px, hairline ring,
  hover `--shadow-sm`: name 18px/600 and `chevron-right`, then a facts panel (`--muted`, radius 10px, padding
  12px 16px, 14px, two columns label muted / value): Andares "Térreo e 1º ao 12º", Unidades "48 · 4 por andar",
  Áreas comuns "15", Tipologias "Tipologia A, Tipologia B, Cobertura". A silhouette of the façade was tried and dropped
  in review: it did not say what it was.
  Then "Áreas comuns da obra" as a list card (below).
- **E3 single tower** (Q7): no tower anywhere. Desktop grid `minmax(0,1fr) 320px`, gap 32px: left, h2 "Fachada" with
  outline "Adicionar andares", then the façade card; right, "Áreas comuns" (the tower's and the obra's in one list).
  Mobile stacks them.
- **E4 loading**: band skeletons and a façade skeleton (9 rows: 36 × 20 label + full-width 44px bar).
- **E5 delivered**: as E2 with no "Adicionar", no menus, and the lock line.
- Error and offline: the blocks of `../obra/` P4a / P4b.

### Torre - `/projects/:id/locations/:towerId`

- **T1 façade** (Q2): a card (padding 20px desktop / 12px mobile, radius 14px, hairline ring). One row per floor, top
  floor first, gap 6px. Each row is a grid: floor label column (88px desktop / 52px mobile), then one column per unit
  up to the tower's widest floor (`minmax(0, 132px)` desktop, `1fr` mobile), then a common-area column (120px / 64px).
  Columns line up across floors, so a floor with fewer units shows the gap where the missing units would be.
  - Floor label: button, 44px tall, 14px/600 muted (Geist Mono for "9º", Geist for "Térreo"), hover `--muted`
    background. Opens the floor.
  - Unit: button 44px tall, radius 8px, 1px `--input` border on `--card`, Geist Mono 14px/500, hover `--muted`. Opens
    the unit. No color: unit status paints this grid only in the #13 dashboard.
  - Common area: same size, `--muted` fill, no border, 12px muted Geist, ellipsis when long; several stack in the area
    column (12º: Hall over Terraço). A floor without units (Térreo) spreads its areas across the whole row.
  - Desktop: grid `minmax(0,1fr) 320px` with "Áreas comuns da torre" on the right; mobile below.
- **T2 tower menu** open (table above).
- **T3 tower without floors**: the empty block, "A Torre A ainda não tem andares" · "Adicione os andares e as unidades
  de uma vez, com a numeração pronta." · primary `lg` "Adicionar andares" → assistente for this tower. Then the
  tower's common areas.
- **T4 error**: `circle-alert` · "Não foi possível carregar a Torre A" · "Confira sua conexão e tente de novo." ·
  `lg` "Tentar de novo" (`refresh-cw`), `role="alert"`; the band shows the back link only.
- **T5 not found**: `map-pin` · "Local não encontrado" · "Ele foi excluído ou arquivado, ou você não tem acesso a
  esta obra." · `lg` "Voltar para a obra".
- **T6 delivered**: façade without actions, lock line.

### Andar - `/projects/:id/locations/:floorId`

Desktop two columns (`1fr 1fr`, gap 32px), mobile stacked: "Unidades" and "Áreas comuns do andar", each an h2 18px
and a **list card** (radius 14px, hairline ring, rows separated by 1px `--border`).

- Row (56px min): the whole row is a button to the item; name 16px/500 (units in Geist Mono), meta 14px muted
  ("Tipologia A", "Tipologia A · 2 alterações", "Sem tipologia"); then the ghost 44px `ellipsis` menu button and a
  20px `chevron-right`.
- Last row: ghost "Adicionar unidade" / "Adicionar área comum" with `plus`, text `--primary`.
- **F3 adding**: the add row turns into a form inside the card: Field "Adicionar unidade" with the next number
  prefilled ("905", Geist Mono), autofocus; primary "Adicionar" and outline "Cancelar" (each `flex: 1` on mobile).
  Enter submits, Escape cancels. A new unit takes the tipologia of nothing; it is set on the unit.
- **F4 name taken** (Q5): Field error "Já existe a unidade 903 na Torre A." Unit names are unique in the tower; floor
  names in the tower; common-area names in their parent; ignoring case and spaces; archived ones do not count.

### Unidade - `/projects/:id/locations/:unitId`

Desktop grid `320px minmax(0,1fr)`, gap 32px; mobile stacked.

- **Tipologia** card (padding 16px): name 16px/600 + outline Badge "2 alterações" when the unit differs from its type;
  14px muted text "Os cômodos acompanham a Tipologia A. O que foi mudado só nesta unidade continua assim quando a
  tipologia muda." (without type: "Os cômodos desta unidade são só dela."). Actions: outline "Trocar tipologia"
  (`layout-grid`) and, with changes, ghost "Voltar à tipologia" (`undo-2`), which drops the unit's own changes.
- **Cômodos** (h2 + count "7 cômodos" muted on the right): list card. Rooms of the type first, then the unit's own
  with an outline Badge "Só desta unidade". Row menu: Renomear, separator, "Remover desta unidade" (room of the type:
  recorded as dropped) / "Remover cômodo" (own). Add row "Adicionar cômodo" with the same inline form (U3).
- **Tirados desta unidade**: 14px/600 muted label, then a list card of the dropped rooms, meta "Da Tipologia A",
  ghost `sm` "Devolver" (`undo-2`).
- **U4 change type**: dialog (below) titled "Trocar a tipologia da 903": "Os cômodos passam a ser os da tipologia
  escolhida. Cômodo com pins continua na unidade." and a radio list (one 44px row per tipologia with its room count,
  plus "Sem tipologia · Cômodos só desta unidade"); action "Trocar".
- A room in use (with pins, from #7) cannot be removed (RF-213): its "Remover" answers with a toast "O cômodo Sacada
  tem pins e não pode ser removido. Renomeie se o nome estiver errado." Not reachable before #7.

### Área comum

Only the Cômodos card (max-width 40rem on desktop); no tipologia. Same rows, menu and add form.

### Assistente - `/projects/:id/structure/new`

Band: back link "Casa Moinhos", h1 "Montar estrutura", meta "Casa Moinhos · nada é salvo antes de criar". From a tower
menu (W9): back link "Torre B", h1 "Adicionar andares à Torre B", meta "A Torre B tem hoje 10 andares, do 1º ao 10º,
com 4 unidades por andar."

- **Desktop**: grid `minmax(0,1fr) 360px`, gap 32px. Left, three section cards (padding 24px, gap 16px), each headed by
  a 24px step circle (`--accent` / `--accent-foreground`, 12px/700) and an 18px/600 title with 14px muted text.
  Right, the **Prévia** card, sticky at `top: 88px`.
- **Mobile**: one step at a time. "Passo 2 de 4" (14px muted) over a 4px segmented progress bar (`--primary` done,
  `--border` to go), the step's content flat on the page, and a sticky bottom bar (top border, safe-area padding):
  outline `lg` "Voltar" (from step 2) and primary `lg` "Continuar · <next step>" (`flex: 2`); on the last step the
  primary becomes "Criar estrutura".

1. **Torres e andares**: "Quantas torres?" with a stepper (outline 44px "−", the count 18px/600 mono, outline 44px
   `plus`). One inner card per tower (padding 16px, hairline ring, `--background`): Field "Nome" (only with 2+ towers);
   "Primeiro andar", "Último andar" and "Unidades por andar" (numeric), three in a row on desktop and on mobile the two
   floor fields side by side with "Unidades por andar" full width below, so labels never wrap out of line; Checkbox "Térreo sem
   unidades" with description "Com hall de entrada"; Checkbox "Hall em cada andar". A new tower copies the previous
   one with the next letter. "Numeração das unidades": SegmentedControl "101, 102" / "1A, 1B" (full width on mobile),
   then "Depois, qualquer nome se troca na própria unidade." With one tower: no name, and "Com uma torre só, ela não
   aparece na navegação: a obra abre direto na fachada." (W8).
2. **Áreas comuns**: "O hall de cada andar já está no passo 1. Aqui entram as outras." Three groups, 16px/500 title +
   14px muted line: "Da obra" (tags + Input "Ex.: Guarita" + outline "Adicionar"), "Em cada torre" (only with 2+
   towers), "Num andar só" (list card of "Terraço · Torre A, 12º andar" rows with a ghost `x` button, then ghost
   "Área comum num andar"). Tags: 32px pills on `--muted`, 14px, a 28px round `x` button.
3. **Tipologias**: "A lista de cômodos de cada tipo de unidade, e onde cada tipo se aplica: por final (a posição da
   unidade no andar: 01, 02…) e por andar." Tipologia cards (grid auto-fit 240px desktop): name 16px/600 + room
   count, room tags, "Novo cômodo" Input + "Adicionar"; outline "Nova tipologia". Then **Onde se aplica**: one rule per
   row (desktop columns Torre · Finais · Do andar · Até o andar · Tipologia · remove; mobile a small card per rule with
   the tipologia select first). Ghost "Regra". Footnote: "Uma obra com todas as unidades iguais tem uma tipologia só,
   em todos os finais e andares. Unidade sem regra fica sem tipologia, e os cômodos dela se cadastram nela." A fresh wizard
   starts with one tipologia applied to every stack and floor;
   the prototype shows an obra already filled in.
4. **Prévia**: "2 torres · 24 andares · 88 unidades" 16px/600, then "30 áreas comuns · Tipologia A: 62 · Tipologia B:
   22 · Cobertura: 4" 14px muted. Info Alert when units are left without a tipologia ("4 unidades ficam sem
   tipologia. Os cômodos delas se cadastram em cada uma."). Primary `lg` full width "Criar estrutura" (`check`); then
   "Nada é salvo antes de criar. Depois, tudo se ajusta na fachada." Then one small façade per tower (22px blocks,
   10px mono, the same aligned columns as T1; new floors in W9 with a dashed `--primary` border). On desktop the
   towers scroll inside the card (`max-height: calc(100dvh - 520px)`) so the button never leaves the screen.

- **W5 validation**: on "Continuar" (mobile) or "Criar estrutura": "Informe o nome da torre.", "Informe o último
  andar.", "O último andar precisa ser igual ou maior que o primeiro.", "De 1 a 30 unidades por andar." under the
  fields; mobile goes back to step 1; the page scrolls to the first invalid field and focuses it.
- **W6 sending**: "Criando estrutura…" with spinner; every control stays as it is, the button is the lock.
- **W7 failure**: danger Alert in the Prévia, above the button: "Não foi possível criar a estrutura. Confira sua
  conexão e tente de novo. Nada foi salvo." Values kept. The request carries client-generated ids, so a retry never
  duplicates (ADR 0071).
- **W10 success**: back to the início (or to the tower for W9) and a success toast "Estrutura criada: 2 torres e 88
  unidades." / "2 andares adicionados à Torre B.".

### Configuração - `/projects/:id/configuration`

The hub of `../obra/` with the Estrutura frame replaced by three sections (Q1, Q10); the side nav becomes Dados da
obra, Status da obra, Estrutura (`layers`), Tipologias (`layout-grid`), Arquivados (`archive`), then the frames of
the other epics. Sections are cards (padding 20px, radius 14px), h3 18px/600.

- **Estrutura**: "2 torres · 24 andares · 88 unidades · 30 áreas comuns" 16px/500; outline "Abrir estrutura"
  (`chevron-right` at the end) → início; ghost "Assistente" (`list-plus`); 14px muted "A estrutura se edita onde se
  navega: torre, andar e unidade têm "Adicionar" e um menu em cada item." Without structure (C5): "A obra ainda não
  tem estrutura." and primary "Montar estrutura".
- **Tipologias**: 14px muted lead "Cada unidade acompanha a sua tipologia; o que for mudado numa unidade continua só
  nela." (none: "Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui."), then rows bleeding
  to the card edge: name, meta "7 cômodos · 44 unidades", menu Editar cômodos / Renomear / separator / Excluir
  tipologia (only with no unit; with units the item reads "Excluir (só sem unidades)" and does nothing). "Nova
  tipologia".
- **C2 editing a tipologia**: the row expands: room tags (a new one ringed `--primary`), "Novo cômodo" + "Adicionar",
  info Alert "Salvar muda as 44 unidades da Tipologia A. 1 unidade com alterações mantém o que foi mudado nela.
  Cômodo com pins não sai das unidades onde está.", primary "Salvar" + outline "Cancelar". Success toast "Tipologia A
  salva. 44 unidades atualizadas."
- **Arquivados** (built with #7, Q12): lead "Locais removidos que tinham pins, plantas ou dados. Não aparecem na
  navegação, nas contagens nem nos relatórios." (empty: "Nada arquivado. Um local removido com pins, plantas ou dados
  aparece aqui e pode ser restaurado."). Rows: name + " · Torre B" path, "12 pins · 2 plantas · 4 unidades e o hall",
  "Arquivado por Ana Lima em 12/10/2026" ("Arquivada" for a unit), then outline `sm` "Restaurar" (`archive-restore`) and a menu with "Excluir
  de vez". Only locations archived on their own are listed; one archived with its parent comes back with it, and one
  archived before its parent shows "Volta junto quando o 9º andar for restaurado, ou depois dele." with no button.
- **C4 assistente**: no actions; `lock` "Só o gerente de obra ou o admin restaura ou exclui de vez."
- **C6 delivered**: nothing editable; Arquivados with `lock` "A obra foi entregue: os arquivados não podem mais ser
  restaurados."

### Remover, renomear e restaurar (Q9, Q10)

Dialogs use the design system's **AlertDialog** (`components/overlay/AlertDialog`: centered on desktop, max-width 30rem;
a bottom panel on mobile with full-width `lg` buttons, action on top). Destructive actions need its new `actionVariant`. Rename, restore and change type are
plain dialogs (`role="dialog"`), the rest `role="alertdialog"`.

- **R1 empty leaf**: deleted at once, toast "Unidade 904 excluída." with outline `sm` "Desfazer" (`undo-2`), 6s.
  Undo recreates it with the same id.
- **R2 empty with children**: "Excluir o 9º andar?" · "O 9º andar não tem pins, plantas nem dados. As 4 unidades e a
  área comum dele também são excluídas." · Cancelar / destructive "Excluir" (`trash-2`).
- **R3 with content** (built with #7): "Arquivar o 9º andar?" · "O 9º andar tem conteúdo registrado em campo, então
  ele não é excluído:" then `archive` "Guarda 12 pins, 2 plantas e os dados de 3 unidades, com as 4 unidades e o
  hall." · `eye-off` "Sai da fachada, das contagens e dos relatórios." · `archive-restore` "O gerente de obra ou o
  admin restaura em Configuração › Arquivados, com tudo como estava." · Cancelar / primary "Arquivar". Toast
  "9º andar arquivado.". Anyone who edits may archive.
- **R4 excluir de vez** (RF-214, manager or admin, built with #7): "Excluir de vez o 9º andar?" · "Isto apaga para
  sempre, sem como recuperar:" with three `trash-2` lines ("12 pins e as 31 fotos deles", "2 plantas", "4 unidades e
  o hall, com os dados das unidades") · Checkbox "Entendi que não dá para desfazer." · destructive "Excluir de vez",
  disabled until checked.
- **R5 restore, name taken** (built with #7): "Restaurar o Salão de festas?" · "Já existe uma área comum Salão de festas
  na Torre A, criada depois. Dê outro nome para o restaurado." · Field "Nome" prefilled "Salão de festas (antigo)" ·
  primary "Restaurar". Without a conflict the dialog only says "Volta para onde estava, com pins, fotos e plantas."
- **R6 / R7 rename**: "Renomear a unidade" · Field "Nome" (Geist Mono for units, hint "Único na torre.") · Salvar;
  conflict "Já existe a unidade 904 na Torre A.".
- **R8 failure**: danger toast "Não foi possível remover a unidade 904. Confira sua conexão e tente de novo."

---

## Who does what

| Action | Admin da construtora | Gerente de obra | Assistente de obra |
| --- | --- | --- | --- |
| Navigate the structure | Any obra (ADR 0067) | Their obras | Their obras |
| Montar estrutura, add, rename, reorder, duplicate, remove (delete or archive), rooms, tipologias | Yes | Yes | Yes (RF-205) |
| Restore an archived location, delete it for good | Yes | Yes | No (RF-212, RF-214) |
| Delivered obra | Reads only | Reads only | Reads only |

## States

| Id | Screen | State |
| --- | --- | --- |
| E1–E5 | Início | No structure · several towers · single tower · loading · delivered |
| T1–T6 | Torre | Façade · menu · no floors · error · not found · delivered |
| F1–F4 | Andar | Floor (assistente) · unit menu · adding · name taken |
| U1–U5 | Unidade / área comum | On its type · with changes · adding a room · change type · common area |
| W1–W10 | Assistente | Towers · common areas · tipologias · preview · validation · sending · failure · single tower · add floors · created |
| C1–C6 | Configuração | Sections · editing a tipologia · archived · archived as assistente · no structure · delivered |
| R1–R8 | Remover etc. | Deleted with undo · delete with children · archive · purge · restore with a taken name · rename · rename taken · failure |

## State management

- `useProjectStructureQuery(projectId)`: towers with floors, units (name, unit type, change count) and common areas,
  plus obra-level common areas. The façade and the tower cards read it; ~500 units is one request.
- `useLocationQuery(projectId, locationId)`: the location, its ancestors and children; 404 → T5.
- `useUnitTypesQuery(projectId)` for the wizard, the unit and the configuração.
- Mutations: create structure (one request with every client-generated id), add, rename, reorder, remove (answers
  `deleted` or `archived`), restore, purge, change unit type, unit room changes, edit unit type. Each invalidates the
  structure query and the location query; rename and reorder can `setQueryData`.
- Local UI state: open menu, inline add form + draft, dialog + its fields, wizard draft (towers, numbering, areas,
  types, rules, current step), toast with undo.

## What the API serves today vs. future

Nothing of the structure exists: no `location`, `room`, `unit_detail`, `unit_type` table, no route. #6 adds them
(`docs/data-model.md` §3) and:

- `GET /api/projects/:id/structure`, `GET /api/projects/:id/locations/:locationId`;
- `POST /api/projects/:id/structure` (the wizard, idempotent by ids), `POST` / `PATCH` / `DELETE` on locations and
  rooms, `PATCH` for order, unit types CRUD;
- every write refuses a delivered obra with `409 PROJECT_DELIVERED` and moves `last_activity_at`;
- `DELETE` answers whether it deleted or archived; until plans exist (#7) it always deletes (ADR 0073).

Archive, restore, purge and the Arquivados list ship with #7 (Q12); R3, R4, R5 and C3, C4 are drawn now so #7 only
builds them. Unit data (status, contractor) comes with #9; it already counts as content.

## Components and assets

Alert, Avatar, Badge, Button, Checkbox, DropdownMenu, Field, Icon, Input, Logo, SegmentedControl, Sheet, Skeleton,
Toast (with `action` for "Desfazer"), AlertDialog. Added to `.claude/skills/bluprint-design/` with this screen: the
DropdownMenuItem `destructive` variant, AlertDialog `actionVariant`, and 11 lucide glyphs (`ellipsis`, `trash-2`,
`archive`, `archive-restore`, `arrow-up`, `arrow-down`, `copy`, `undo-2`, `building-2`, `layout-grid`, `list-plus`).
`_ds_bundle.js` is generated and does not carry them yet (nor `settings`, `pencil` and `layers` from the obra), so
until it is rebuilt the prototype loads them from `icons/` and draws the dialog with the `bp-alert-dialog` classes.

## Open points

1. Duplicar torre / andar / unidade (RF-208) has its menu item; its dialog (new name, what is copied) is a small
   follow-up decided in the ticket.
2. Condomínio de casas (a house over two floors) does not fit the model and is out of #6.
3. Pasting a spreadsheet of units is a possible future feature, only if a customer asks (Q4).
