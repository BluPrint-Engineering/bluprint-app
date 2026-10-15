# Handoff - Estrutura da obra (#6)

Short version of `README.md`. Built from BluPrint design-system primitives (Alert, Avatar, Badge, Button, Checkbox,
DropdownMenu, Field, Icon, Input, Logo, SegmentedControl, Sheet, Skeleton, Toast/Toaster) and AlertDialog. Two
new primitive variants, a **destructive DropdownMenuItem** and AlertDialog's `actionVariant`, and eleven new lucide glyphs,
added to the design system with this screen. `_ds_bundle.js` is generated and does not carry them yet, so the
prototype loads the glyphs from `icons/` with `Icon basePath`.

| File | What it is |
| --- | --- |
| `Estrutura.dc.html` | Live screens. Demo props: `theme`, `viewport`, `role`, `structure` (multi / single / empty), `screen` (home / tower / floor / unit / area / wizard / configuration), `state`, `delivered`, `createResult`, `removeResult`; also read from the URL |
| `Estrutura QA.dc.html` | E1–E5, T1–T6, F1–F4, U1–U5, W1–W10, C1–C6, R1–R8 frozen, mobile + desktop, light + dark |
| `icons/` | Glyphs the generated `_ds_bundle.js` does not carry yet |

| Screen | Route | #6 builds |
| --- | --- | --- |
| Início da obra | `/projects/:id` | Towers or the façade of a single tower, common areas, "Montar estrutura" |
| Torre / andar / unidade / área comum | `/projects/:id/locations/:locationId` | Façade, lists, rooms, tipologia of a unit, menus, add, rename, reorder, remove (delete) |
| Assistente | `/projects/:id/structure/new` | The whole wizard, and "Adicionar andares" to a tower |
| Configuração | `/projects/:id/configuration` | Estrutura summary and Tipologias; Arquivados ships with #7 |

## Layout decisions (designer's calls)

- **Façade**: one row per floor, top first; units in aligned columns (the widest floor sets them), common areas in a
  column of their own, stacked when a floor has two; a floor without units spreads its areas over the row. Units
  are mono numbers on outlined 44px blocks, common areas muted fills. No color: status is the #13 dashboard's.
- **Tower cards** on the início carry their facts (floors, units per floor, common areas, tipologias), so towers that
  differ are told apart at a glance.
- **Single tower** (Q7): the início is the façade; the tower name drops out of every back link and meta line.
- **Band**: back link to the parent, h1 the location (units in mono), a meta line with kind, place and counts; the
  page menu is a 44px `ellipsis` button (top right on mobile, after "Adicionar andares" on desktop).
- **Lists** (floor, rooms, common areas, tipologias): rows of 56px in a ringed card; the row is the link, `ellipsis`
  menu and `chevron-right` at the end; the last row adds inline.
- **Wizard**: desktop is one page with a sticky Prévia whose button never leaves the screen; mobile is four steps with
  a sticky bottom bar. The same wizard adds floors to an existing tower.
- **Remover** is one menu item; the dialog (or the undo toast) says what will happen: delete, delete with children,
  or archive with what is kept.

## Not in #6

Archive, restore, purge and the Arquivados list (#7, Q12); unit data and contractors (#9); plans of a floor or unit
(#7, #8); the status colors of the façade (#13); moving a location to another parent (Q11); pasting a spreadsheet (Q4).
