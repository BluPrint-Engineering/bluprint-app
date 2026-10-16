# Handoff - Unidades, as reservas das obras (ticket 2.13)

Short version of `README.md`. Built only from BluPrint design-system primitives: Card (+ CardContent, CardFooter),
Input, Field, Button, Alert, Toast/Toaster, Skeleton, Icon, and the obras app header (Logo, Avatar, DropdownMenu,
SegmentedControl). No primitive, variant or glyph was added.

| File | What it is |
| --- | --- |
| `Unidades.dc.html` | The live screen. Demo props: `theme`, `viewport`, `state`, `saveResult`; also read from the URL |
| `Unidades QA.dc.html` | RS1–RS10 frozen, mobile 390 × 844 and desktop 1280 × 800, light and dark |

| Screen | Route | Who |
| --- | --- | --- |
| Unidades | `/units`, from the free units link on `/projects` | Admin da construtora only; anyone else is redirected to `/projects` |

## Layout decisions (designer's calls)

- **Column**: back link "Obras", h1 "Unidades" and one muted line, in a 48rem column left-aligned under the 72rem
  header, like the configuração.
- **Figures**: Contratadas · Reservadas · Livres as three small cards in one row on every width, values in Geist
  Mono. A changed figure shows "Antes: N" under it; that line is always reserved so the list never jumps while
  typing. Negative livres read "−40" in `--destructive`.
- **Desktop list**: one card with columns Obra · Usadas · Reserva (input) · Restam, numbers right-aligned in Geist
  Mono, rows of 61px like the estrutura lists. The footer with "N reservas alteradas", Descartar and Salvar appears
  only when something changed, and sticks to the bottom of the viewport on long lists.
- **Mobile**: a card per obra: name, "Usadas 180 · Restam 120", Field "Reserva" with the input full width. A
  fixed bottom bar appears only when something changed: "N reservas alteradas" and the live "Livres N", then
  Descartar (outline) and Salvar (primary, wider).
- **Changed row**: 3px `--primary` bar on the left edge plus "Antes: 400" (under the name on desktop, as the field
  hint on mobile, so the input never moves).
- **Errors**: row errors under the row (desktop) or the input (mobile), shown after blur; the total over the
  contratadas is an Alert at the top; either disables Salvar. A save failure is an Alert next to the buttons.
- **Delivered obras** are not rows: one muted `lock` line "2 obras entregues usaram 450 unidades." under the list,
  which is what makes Reservadas add up.

## States (QA ids)

RS1 pronta · RS2 editando (uma baixa, uma sobe) · RS3 reserva abaixo das usadas · RS4 passa das contratadas ·
RS5 salvando · RS6 salvo (toast) · RS7 falha ao salvar · RS8 carregando · RS9 erro ao carregar · RS10 nenhuma obra
em andamento. Not admin: redirect, no screen.

## Example data

2.000 contratadas. Em andamento: Edifício Aurora 300 / 180, Residencial Jardins 400 / 250, Residencial Primavera
50 / 0, Torre Atlântica 500 / 482 (reserva / usadas). Two delivered obras used 450. Reservadas 1.700, livres 300,
the same "300 unidades livres" the obras list links from.

## API

`GET /api/organization/units` → `{ contracted, reserved, free, reclaimable }`; rows from the obras em andamento with
`units: { reserved, used }`; `PATCH /api/organization/units/reservations` `{ items: [{ projectId, reserved }] }`,
all or nothing, refusals per item. None of it is served yet; the full table and the open points are in `README.md`.
