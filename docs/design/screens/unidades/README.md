# Handoff: Unidades - as reservas das obras (ticket 2.13)

## Overview

**Unidades** is where the admin da construtora sees the unidades the construtora bought and moves them between
obras, at `/units`. A **licença** is a purchase of N unidades; **contratadas** is the sum of the licenças. Every obra
holds a **reserva**; **livres** = contratadas − the reservas of every obra, delivered ones included. An obra creates
units up to its reserva; **usadas** counts the units that exist plus the removed ones that held content; **restam**
= reserva − usadas. Delivering an obra turns its reserva into its usadas, so delivered obras are not edited here.

Admin only (ADR 0067). The entry is the free units link on the obras list ("300 unidades livres", or "Baixe a
reserva de uma obra" when none is free, see `../obras/`). Moving 100 unidades from one obra to another is lowering
one row and raising another, then one "Salvar" for both. A gerente or assistente opening `/units` is sent back to
`/projects`, with no screen.

The model, the API contract and the approved copy come from the units refinement (rounds 1 to 3). They are not
repeated here beyond what the screen needs.

## About the design files

`Unidades.dc.html` and `Unidades QA.dc.html` are **HTML design references** that load the design system from
`.claude/skills/bluprint-design/`. Recreate them in `apps/web` with the existing stack (TanStack Router + Query,
Tailwind v4, shadcn radix-nova, `lucide-react`); do not copy the prototype code. Serve the repo root
(`bunx serve .`) and open `docs/design/screens/unidades/Unidades.dc.html`; demo props also read from the URL
(`?state=editing&theme=dark`). The live prototype edits, validates, saves (`saveResult` = `fail` to see RS7) and
discards. **Fidelity: high.**

## Route and files in `apps/web`

```
src/routes/_authenticated/units.tsx              ← admin only (beforeLoad on the organization role); others redirect to /projects
src/features/organization/
  api.ts                                         ← useOrganizationUnitsQuery, useUpdateReservationsMutation
  UnitsPage/UnitsPage.tsx
  UnitsPage/UnitFigures.tsx                      ← the three figures
  UnitsPage/ReservationList.tsx                  ← desktop list card, mobile cards, footer / bottom bar
```

Files follow ADR 0053: everything starts in the page folder and climbs only when a second page needs it. The app
header (logo + user menu) is the one the obras list already has.

---

## Screen

Breakpoint **768px**. App header exactly as on Obras: 56px mobile, 64px sticky desktop, logo to `/projects`, user
menu with "Admin da construtora".

### Page frame

- Main: max-width 72rem, centered; padding mobile `8px 16px 32px`, desktop `32px 32px 48px`. Inside, one column
  of max-width **48rem**, left-aligned (the configuração column width), gap 20px.
- **Back link** "Obras": `chevron-left` 20px + 14px/500 `--muted-foreground` (hover `--foreground`), 44px tall,
  pulled 6px left so the glyph aligns with the content edge. Goes to `/projects` with the list's previous search
  params. Gap to the title 4px mobile, 8px desktop.
- `<h1>` "Unidades": 28px mobile / 36px desktop, 600, tracking -0.02em, leading 1.15. Under it (gap 8px) the line
  "A reserva de cada obra sai das unidades contratadas. O que sobra fica livre." 14px muted, `text-wrap: balance`.

### Figures

- Grid of three equal columns (also at 390px), gap 8px mobile / 12px desktop: **Contratadas**, **Reservadas**,
  **Livres**. Each is a Card `sm` (hairline ring, padding 12px; 16px on desktop).
- Label 14px `--muted-foreground`; value in **Geist Mono** 600, 22px on a 28px line (mobile) / 28px on a 32px line
  (desktop), pt-BR thousands ("2.000"). Container `role="group"`, `aria-live="polite"`.
- They update live while rows change. A figure that differs from what is saved shows "Antes: 1.700" (12px muted,
  16px line) under the value. That line is **always reserved**, hidden when unchanged, so the first keystroke never
  pushes the list down under the finger.
- Livres below zero reads "−40" (U+2212) in `--destructive`, together with the Alert below.

### List - desktop (≥ 768px)

There is no Table primitive; the list is a Card built like the estrutura list cards (hairline ring, rows separated
by 1px `--border`), padding 0, gap 0, with table semantics (`role="table"` / `row` / `columnheader` / `rowheader` /
`cell`, or a real `<table>` in the app).

- Columns: `minmax(0,1fr) 88px 120px 88px`, column gap 24px, padding-inline 16px.
- Header row 40px: "Obra", "Usadas", "Reserva", "Restam", 14px/500 muted; the three number headers right-aligned.
- Row: padding-block 8px, min height 61px. **Obra**: name 16px/500, wraps (`overflow-wrap: anywhere`).
  **Usadas** and **Restam**: Geist Mono 16px/500, right-aligned. **Reserva**: Input 44px, Geist Mono, text
  right-aligned so the three columns line up, `inputMode="numeric"`, `aria-label="Reserva de Edifício Aurora"`.
- Restam updates as the reserva is typed; below zero it reads "−30" in `--destructive`; an empty field reads "–".
- **Changed row**: a 3px `--primary` bar inset at its left edge and "Antes: 400" (14px muted) under the name. Text
  and bar, never the bar alone (RNF-07). The meta line fits beside the 44px input, so the row does not grow.
- **Row error**: the Field error (icon + 14px/500 `--destructive`) on its own line under the row, full row width,
  and the input `invalid`.
- **Footer** (only when something changed): CardFooter, `position: sticky; bottom: 0` so it stays on screen with a
  long list; opaque background (`--muted` 50% over `--card`), bottom radius 14px, `border-top`. Left "2 reservas
  alteradas" / "1 reserva alterada" (14px muted); right outline **Descartar** and primary **Salvar**, `md` 44px, gap
  12px. A save failure puts the danger Alert full width at the top of the footer, next to the action that failed.

### List - mobile (< 768px)

- One Card per obra, gap 12px; Card padding 16px, content gap 12px.
- Name 16px/600. Then a two-column row: "Usadas **180**" and "Restam **120**", label 14px muted + value Geist Mono
  16px/500, baseline-aligned, gap 8px.
- Field "Reserva" (4px extra above it) with the Input **full width**, Geist Mono. Changed: hint "Antes: 400" under
  the input, plus the 3px `--primary` bar on the card's left edge. The hint sits under the input, so the input
  itself never moves when it changes. An error replaces the hint.
- **Bottom bar** (only when something changed): fixed outside the scroll area, as the obras bar: `border-top`,
  `--background`, padding `12px 16px calc(12px + env(safe-area-inset-bottom))`, gap 12px.
  1. Save failure: the danger Alert.
  2. A line, `space-between`, 14px muted: "2 reservas alteradas" and "Livres **250**" (value Geist Mono,
     `--foreground`; below zero `--destructive`). The livres stay readable while the figures are scrolled away.
  3. Outline `lg` **Descartar** (`flex: 1`) and primary `lg` **Salvar** (`flex: 2`), gap 8px.

### Delivered obras

Not listed: their reserva became their usadas and cannot change. Under the list, `lock` 16px + "2 obras entregues
usaram 450 unidades." / "1 obra entregue usou 120 unidades." (14px muted), in the past tense like the delivered row of Dados da obra ("Usou 380 unidades."). This line is what makes Reservadas add up:
1.250 in the rows + 450 delivered = 1.700. Hidden when no obra is delivered.

### Validation

- The input takes digits only (up to 5); the reserva has no per-row ceiling, only the total does.
- Empty: "Informe quantas unidades reservar." Below usadas: "A obra já usa 250 unidades. A reserva não pode ficar
  abaixo disso." ("1 unidade" in the singular). 0 is valid for an obra that uses 0.
- A row error shows once the field loses focus (or Salvar is attempted), then follows the typing.
- Total over the contratadas: danger Alert at the top of the column, above the figures: "As reservas passam das
  unidades contratadas em 40. Baixe alguma reserva ou fale com a BluPrint." It follows the typing, with no blur.
- **Salvar** is disabled while any row is invalid or the total passes the contratadas.

### Saving

- **Salvar** sends only the changed rows, at once: `PATCH /api/organization/units/reservations`
  `{ items: [{ projectId, reserved }] }`, all or nothing.
- Sending: the button reads "Salvando…" with the spinner, every input and Descartar are disabled.
- Success: the values become the saved ones (marks and "Antes" go away), the footer or bar leaves, success toast
  "Reservas salvas." (bottom-center on mobile, bottom-right on desktop, ~6s). Invalidate the units query, the
  obras list and each changed obra's `GET /api/projects/:id/units`.
- `409 RESERVATION_BELOW_USED` for an item (`items[].projectId`, `used`): that row shows the below-usadas error
  with the server's `used`, draft kept (the obra created units meanwhile).
- `409 NO_UNITS_LEFT` (`requested`, `available`): the top Alert with N = `requested − available`, draft kept.
- Any other failure: danger Alert "Não foi possível salvar as reservas. Confira sua conexão e tente de novo.",
  values kept, Salvar available again.
- **Descartar** drops every draft and error at once, no confirmation (nothing was saved).

---

## States

Each state exists in light and dark, mobile and desktop, frozen in `Unidades QA.dc.html`. Example data: Construtora
Horizonte, 2.000 contratadas; em andamento Edifício Aurora (reserva 300, usa 180), Residencial Jardins (400, 250),
Residencial Primavera (50, 0, just created), Torre Atlântica (500, 482); two delivered obras used 450. Rows sort by
name A–Z.

| Id | State | What shows |
| --- | --- | --- |
| RS1 | Pronta | Contratadas 2.000 · Reservadas 1.700 · Livres 300; four rows; "2 obras entregues usaram 450 unidades." |
| RS2 | Editando | Jardins 400 → 300, Torre Atlântica 500 → 650: Reservadas 1.750 (Antes: 1.700), Livres 250 (Antes: 300); both rows marked; footer / bar "2 reservas alteradas". |
| RS3 | Reserva abaixo das usadas | Aurora 300 → 150 with 180 usadas: error under the row, Restam −30, Salvar disabled. Livres 450 still shown: the figures do not hide what is typed. |
| RS4 | Passa das contratadas | Primavera 50 → 390: Reservadas 2.040, Livres −40, top Alert "… em 40 …", Salvar disabled. |
| RS5 | Salvando | RS2 values; "Salvando…", inputs and Descartar disabled. |
| RS6 | Salvo | RS2 values are now the saved ones (Reservadas 1.750, Livres 250), no marks, toast "Reservas salvas.". |
| RS7 | Falha ao salvar | RS2 values kept; danger Alert in the footer / bar above the buttons. |
| RS8 | Carregando | Real back link, title and labels; values, rows and inputs are Skeletons of the same size (figures 56 / 80 × 28 / 32; desktop rows 61px with a 44px input skeleton; mobile cards at the ready height). |
| RS9 | Erro ao carregar | Back link and title stay; centered block: `circle-alert` · "Não foi possível carregar as unidades" · "Confira sua conexão e tente de novo." · `lg` "Tentar de novo". `role="alert"`. |
| RS10 | Nenhuma obra em andamento | Figures still shown (2.000 · 1.700 · 300); centered block: `building` · "Nenhuma obra em andamento" · "6 obras entregues usaram 1.700 unidades." No button. With no obra at all the text line is absent. |
| - | Não admin | Redirect to `/projects`; no screen. |

Centered blocks follow the Obras pattern: max-width 26rem, gap 16px, padding-block 48px, icon 24px muted, title
18px/600, text 14px muted.

## State management

- `useOrganizationUnitsQuery()` → `GET /api/organization/units` → `{ contracted, reserved, free, reclaimable }` (admin only,
  403 otherwise). The rows come from the obras em andamento with `units: { reserved, used }` (the obra summary
  gains it). The delivered line is derived: used = `reserved` − Σ rows' reserva; count = `counts.delivered` of
  `GET /api/projects`.
- Local UI state: draft per obra (string, so an empty field is representable), touched per obra, saving, save
  error. Figures, restam, changed marks and validity are derived from saved values + drafts, never stored.
- `useUpdateReservationsMutation` → `PATCH /api/organization/units/reservations`; on success `setQueryData` on the
  units query and invalidate the obras list and the changed obras.
- Leaving the page with drafts: the drafts are lost (no blocker); a later ticket can add one if it is missed.

## What the API serves today vs. what is future

| Element | Status |
| --- | --- |
| Organization role (`GET /api/organization`) | Served |
| Licences as purchases of N unidades, contratadas | Served: a `license` row is a purchase of `units`; signup seeds one license of 500 |
| Reserva per obra, usadas, `units: { reserved, used }` on the obra summary | Served; `used` counts the units in the obra's structure |
| `GET /api/organization/units` → `{ contracted, reserved, free, reclaimable }` | Served, admin only |
| `PATCH /api/organization/units/reservations`, `RESERVATION_BELOW_USED`, `PROJECT_DELIVERED` | Not served |
| `NO_UNITS_LEFT` with `requested` and `available` | Served by `POST /api/projects` |
| `GET /api/organization/licenses` | Never served; `NO_FREE_LICENSE` is dropped |

## Interactions and motion

- Hover 120ms, buttons and inputs 180ms, all `cubic-bezier(.2,0,.2,1)`; the toast enters with `--ease-out`.
  `prefers-reduced-motion` sets durations to 0.
- Press: 1px down, never scale. Focus-visible: 3px ring `--shadow-focus` + solid `--ring` border.
- Tap targets: 44px minimum (back link, inputs, footer buttons), 52px for the mobile bar buttons.
- Enter in an input does not submit; Salvar is always an explicit tap.

## Components (design system → shadcn)

| Used here | shadcn primitive |
| --- | --- |
| Card (+ CardContent, CardFooter) | `card` |
| Input, Field | `input`, `field` |
| Button | `button` |
| Alert | `alert` |
| Toast / Toaster | `sonner` |
| Skeleton | `skeleton` |
| Logo, Avatar, DropdownMenu, SegmentedControl, Icon | the app header, as on Obras |

No primitive, variant or glyph was added. Icons: `chevron-left`, `lock`, `building`, `circle-alert`, plus the
header's `chevron-down`, `sun`, `moon`, `log-out`.

## Copy (pt-BR, verbatim)

Approved in the refinement: Unidades · Obras (back link) · Contratadas · Reservadas · Livres · Usadas · Reserva ·
Restam · Salvar · Descartar · Salvando… · "Reservas salvas." · "A obra já usa 250 unidades. A reserva não pode ficar
abaixo disso." · "As reservas passam das unidades contratadas em 40. Baixe alguma reserva ou fale com a BluPrint." ·
Nenhuma obra em andamento · Tentar de novo.

Written in this design (review): "A reserva de cada obra sai das unidades contratadas. O que sobra fica livre." ·
Obra (column header) · "Antes: 400" · "2 reservas alteradas" / "1 reserva alterada" · "Livres 250" (mobile bar) ·
"2 obras entregues usaram 450 unidades." / "1 obra entregue usou 120 unidades." · "Informe quantas unidades reservar."
(from Nova obra) · "Não foi possível carregar as unidades" · "Confira sua conexão e tente de novo." · "Não foi
possível salvar as reservas. Confira sua conexão e tente de novo."

## Files in this bundle

| Path | What it is |
| --- | --- |
| `Unidades.dc.html` | The live screen. Demo props: `theme`, `viewport`, `state` (`live`, `ready`, `editing`, `below-used`, `over-contracted`, `saving`, `saved`, `save-failed`, `loading`, `error`, `none-active`), `saveResult`; also read from the URL |
| `Unidades QA.dc.html` | RS1–RS10 frozen side by side |
| `HANDOFF.md` | Short version of this README |
| `support.js` | The prototype runtime, same file as the other screens |

## Open points

1. The rows need every obra em andamento in one response, and `GET /api/projects` pages at 12. The implementation
   refinement picks between a large `pageSize` on the list and `GET /api/organization/units` carrying the rows.
2. An obra delivered while the admin edits it answers `409 PROJECT_DELIVERED`; no state is drawn. Proposal: refetch,
   the obra leaves the list with its draft, the other drafts stay, and a danger Alert says which obra was delivered
   (copy to write).
3. The only way in is the free units link on the obras list (and its 0-livres sentence). A "Unidades" item in the
   user menu was not added; decide if the admin needs it from other screens.
