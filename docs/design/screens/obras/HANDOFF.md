# Handoff — Obras, a lista de obras (#45)

The first screen after login. Built only from BluPrint design-system primitives: Avatar, Badge, Button,
Card, Icon, Logo, SearchInput, SegmentedControl, DropdownMenu (+Item/Label/Separator), Sheet, Pagination,
Skeleton, Spinner, Toast/Toaster. No primitive or icon was added.

| File | What it is |
| --- | --- |
| `Obras.dc.html` | The live screen. Demo props (Tweaks): `theme`, `viewport`, `role`, `state`, `overlay`, `ctaPlacement`, `licensesAvailable`, `signOutResult`, `moreFails` |
| `Obras QA.dc.html` | Every state frozen side by side (O1–O17) |

## Where it lands in `apps/web`

```
src/routes/_authenticated/index.tsx      ← "/" becomes a redirect to "/projects" (landing page later)
src/routes/_authenticated/projects.tsx   ← new route; validateSearch for q, status, manager, sort, page
src/features/projects/
  ProjectsPage.tsx                       ← this screen
  components/AppHeader.tsx               ← logo + user menu (reused by every signed-in screen)
  components/UserMenu.tsx                ← name, e-mail, Tema, Sair
  components/ProjectCard.tsx
  components/ProjectsToolbar.tsx         ← desktop inline toolbar
  components/ProjectsFilterSheet.tsx     ← mobile bottom sheet (shadcn drawer)
  components/NewProjectAction.tsx        ← button + license count; hidden for non-admins
  api.ts                                 ← useProjectsQuery (TanStack Query, keyed by the search params)
src/components/ui/                       ← avatar, badge, skeleton, sonner, dropdown-menu, drawer,
                                           pagination, toggle-group (bunx shadcn add), per the DS HANDOFF
```

A card links to `/projects/$projectId` (not designed yet). "Nova obra" links to the creation form (#46).

## URL

`/projects?q=torre&status=entregue&manager=<userId>&sort=pendencias&page=2`. Defaults are omitted:
`status=andamento`, `manager` = all, `sort=recentes`, `page=1`. Changing search, a filter or the sort resets
`page`. Returning from a project restores the same page, filters and search. The prototype writes these
params with `history.replaceState` when opened on its own.

## Layout rules

- Breakpoint 768px. Mobile: one column, header scrolls away, the search row is sticky (gains a bottom
  border once stuck). Desktop: sticky 64px header, content capped at `--content-max-wide` (72rem),
  grid `repeat(auto-fill, minmax(300px, 1fr))` → 3 columns at 1280.
- **Page size 12**: fills the grid in 3 columns (4 rows) and 2 columns (6 rows). Mobile loads 12 at a time.
- Desktop toolbar uses 36px controls (`sm`), allowed there by the readme. Mobile controls are 44px, the
  primary action 52px.
- **"Nova obra" placement** (decided): desktop, right of the title with the license count before it. Mobile, a
  fixed bottom bar, always visible and in thumb reach; the toast is lifted above it. The `ctaPlacement="title"`
  prop is kept only as a record of the rejected option.
- **Licenses show only what is free**: "2 licenças disponíveis" / "1 licença disponível". A license is consumed
  when an obra is created and never returns, so the total bought is not shown. Zero reads "Sem licenças
  disponíveis. Fale com a BluPrint." and disables the button.
- **Role on the card only when it varies.** An admin has the same role in every obra, so the card does not
  repeat it; "Admin da construtora" appears once, in the user menu under the e-mail. Managers and assistants
  see their role in that obra (Gerente de obra / Assistente de obra) as a muted line under the name.
- Card: name (2 lines max) with the status badge top-right; role line (non-admins); divider; open pins left,
  last activity right. No chevron: the whole card is the link.
- Delivered obra: neutral badge, card without fill (hairline only), muted pin count. Still clickable.
- Filter count on the mobile button and in the sheet counts status ≠ Em andamento and gerente ≠ todos.
  Sort is not a filter. "Limpar filtros" resets status and gerente (and the search, in the no-results state).

## States (QA ids)

O1 carregando · O2 com obras, admin · O3 com obras, gerente/assistente · O4 admin sem licença · O5 vazio,
admin · O6 vazio, admin sem licença · O7 vazio, gerente/assistente · O8 sem resultados · O9 erro ao carregar ·
O10 sem conexão (resumes on the `online` event, no button) · O11 carregando mais (mobile) · O12 erro ao
carregar mais (mobile) · O13 trocando de página (desktop) · O14 filtros abertos (mobile) · O15 menu do usuário ·
O16 saindo (spinner on Sair, menu locked) · O17 falha ao sair (toast, user stays signed in).

Sign-out has no confirmation. On success it goes to `/login`.

## What the API serves today vs. what is future

The API currently returns the member's projects (id, name, the user's role). Everything below needs a
ticket before the screen can show it; until then the UI hides the element rather than faking it.

| Element | Status |
| --- | --- |
| List of obras the user belongs to, name, the user's role | **Served** |
| Admin sees every obra of the organization | Future |
| Search by name (`q`) | Future — server-side, so it works across pages |
| Status (Em andamento / Entregue) and its filter | Future — needs a project status field |
| Gerente responsável filter (admin) | Future — needs the responsible manager on the project |
| Sort: Nome A–Z | Future (trivial) · Mais pendências abertas, Atividade recente — Future |
| Open pins count ("42 pendências abertas") | Future — aggregate on pins |
| Last activity ("Atividade há 2 h") | Future — `lastActivityAt` on the project |
| Pagination (`page`, `pageSize=12`, total count) | Future |
| Available license count ("2 licenças disponíveis") and the no-license state | Future — organization licenses (only the available count is needed) |
| "Nova obra" entry point | Future — the form is #46 |
| Profile photo in the Avatar | Future — initials until upload exists |

## Copy (pt-BR, verbatim)

Obras · "N obras" / "1 obra" · Nova obra · "N licenças disponíveis" / "1 licença disponível" · "Sem licenças disponíveis. Fale com
a BluPrint." · Buscar obra · Filtros · Status: Em andamento, Entregue, Todas · Gerente responsável ·
Ordenar: Mais recentes, Nome A–Z, Mais pendências abertas, Atividade recente · Limpar filtros ·
"Ver N obras" · "N pendências abertas" / "1 pendência aberta" / "Nenhuma pendência aberta" ·
"Atividade há 25 min / 2 h / 3 dias" · Nenhuma obra ainda · "Crie a primeira obra da construtora para
começar a mapear pendências." · Nenhuma obra por aqui · "Você verá uma obra aqui quando o admin da
construtora te vincular a ela." · Nenhuma obra encontrada · "Nenhum resultado para “brisa” em obras em
andamento." · Não foi possível carregar suas obras · Confira sua conexão e tente de novo. · Tentar de novo ·
Sem conexão. · Continuamos assim que a internet voltar. · Carregar mais · Carregando mais obras… ·
Não foi possível carregar mais obras. · Mostrando 1–12 de 26 · Tema · Sair · "Não foi possível sair.
Confira sua conexão e tente de novo."

The admin empty-state sentence ("Crie a primeira obra…") was not in the brief; review it.

## Notes for the build

- In the filter sheet, Gerente and Ordenar are radio lists drawn with `DropdownMenuItem` (44px rows,
  trailing check, `role="radio"`). In `apps/web` build them as a `radio-group`/`toggle-group` inside the
  drawer, not as menu items.
- The whole card is one link (`<Link>` wrapping the Card).
- Loading keeps the real header, title and toolbar; only the count and the cards are skeletons, in the
  same grid, so nothing moves when data lands.
