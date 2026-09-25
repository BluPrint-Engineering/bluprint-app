# Handoff: Obras — lista de obras (#45), com Entrar (#42) e Criar conta (#43)

## Overview

**Obras** is the first screen after login and the home of the BluPrint web app, at `/projects`. It lists the
obras the user can see: an admin da construtora sees every obra of the organization; a gerente de obra or
assistente de obra sees only the obras they belong to. From here the user opens an obra
(`/projects/:id`, not designed yet) and the admin starts a new one (form is #46, out of scope).

Entrar and Criar conta are included because the flow changes: **after login the app lands on Obras**
(`/` redirects to `/projects`). Those two screens are already implemented in `apps/web`; the files here are a
recreation of that code for reference, and need no change except the redirect.

## About the design files

The files in `screens/` are **design references built in HTML** (browser React prototypes that load the
BluPrint design system from `.claude/skills/bluprint-design/`). They show the intended look and behavior. They are **not production
code to copy**. The task is to **recreate them in `apps/web`** with the stack it already has: Vite +
TanStack Router + TanStack Query + Tailwind v4 + shadcn (radix-nova), `lucide-react`,
`@fontsource-variable/geist`. Each design-system primitive maps to a shadcn primitive added with
`bunx shadcn add` (table in "Components").

To open the prototypes, serve the repo root with any static server (for example `bunx serve .`) and open
`docs/design/screens/obras/Obras.dc.html`. Opening the file directly from disk may block the scripts.

## Fidelity

**High fidelity.** Colors, type, spacing, radii, states, motion and copy are final. Match them pixel for
pixel, using the design tokens by name (they already exist in, or go into, `apps/web/src/styles/globals.css`).

---

## Route and files in `apps/web`

```
src/routes/_authenticated/index.tsx      ← "/" becomes redirect({ to: "/projects" }) (landing page later)
src/routes/_authenticated/projects.tsx   ← new route, validateSearch for q, status, manager, sort, page
src/features/projects/
  ProjectsPage.tsx
  components/AppHeader.tsx               ← logo + user menu, reused by every signed-in screen
  components/UserMenu.tsx
  components/ProjectCard.tsx
  components/ProjectsToolbar.tsx         ← desktop inline toolbar
  components/ProjectsFilterSheet.tsx     ← mobile bottom sheet (shadcn drawer)
  components/NewProjectAction.tsx        ← button + available licenses; rendered only for admins
  api.ts                                 ← useProjectsQuery, keyed by the search params
```

The login already pushes `redirect ?? "/"` on success (`src/routes/login.tsx`), so the redirect in
`_authenticated/index.tsx` is the only change on the auth side.

### URL

`/projects?q=torre&status=entregue&manager=<userId>&sort=pendencias&page=2`

- Defaults are omitted: `status=andamento`, `manager` = all, `sort=recentes`, `page=1`.
- Changing the search, a filter or the sort resets `page` to 1.
- Returning from a project restores the same page, filters and search (they live in the URL).
- `manager` is ignored for non-admins.

---

## Screens / views

Breakpoint: **768px**. Below it is mobile, from it up is desktop.

### Header (both)

- Background `--background`, `border-bottom: 1px solid --border`, `padding-top: env(safe-area-inset-top)`.
- Inner row: max-width `--content-max-wide` (72rem), centered; padding-inline 16px mobile / 32px desktop;
  height **56px mobile**, **64px desktop**; `justify-content: space-between`.
- Left: horizontal lockup (`Logo wordmark`), mark height 28px mobile / 32px desktop. Tone `gradient` in
  light, `white` in dark. Wrapped in a 44px-tall link to `/projects`.
- Right: the user-menu trigger, a ghost button.
  - Mobile: 44 × 44 icon button holding the Avatar `md` (36px, initials).
  - Desktop: 44px-tall ghost button, padding `4px 8px`, gap 8px: Avatar `md` + user name (14px/500) +
    `chevron-down` 16px in `--muted-foreground`.
  - `aria-label="Conta de <nome>"`.
- **Sticky on desktop** (`position: sticky; top: 0; z-index: 30`). **Scrolls away on mobile**, where the
  search row is sticky instead.

### User menu (DropdownMenu, align end, width 312px)

1. Label block: Avatar `lg` (48px) + name (16px/600, leading 1.3) + e-mail (14px `--muted-foreground`,
   single line, ellipsis). **Admins only** get a third line "Admin da construtora" (14px muted). Managers
   and assistants have a role per obra, so none is shown here.
2. Separator.
3. Row "Tema" (44px, padding-left 12px, space-between) with a small SegmentedControl: sun / moon icons
   (18px), `aria-label` "Tema claro" / "Tema escuro". Toggles `.dark` on the root.
4. Separator.
5. Item "Sair" with `log-out` icon (20px, muted). No confirmation.
   - While signing out: the icon becomes a spinner (18px), the item stays readable (`aria-busy`), the menu
     is **locked** (cannot close, other items disabled).
   - Success → `/login`.
   - Failure → menu closes, toast (below), the user stays signed in.

Menu surface: `--popover`, radius `--radius-lg` (10px), `box-shadow: --ring-hairline, --shadow-md`,
padding 4px, 6px below the trigger, enter animation 180ms fade + 4px slide.

### Title row

- `<h1>` "Obras": 28px (`--text-2xl`) mobile, 36px (`--text-3xl`) desktop; weight 600; tracking -0.02em;
  leading 1.15.
- Count next to it, baseline-aligned, gap 12px: "12 obras" / "1 obra", 16px `--muted-foreground`, tabular
  numbers. It is the count of the current filtered result, not the total.
- Desktop admin: on the right, "N licenças disponíveis" (14px muted) then the **Nova obra** button
  (`default`, `md` 44px, `plus` icon 20px), gap 16px.

### Toolbar — desktop (inline, gap 12px, wraps)

1. SearchInput `sm` (36px), width 260px, placeholder "Buscar obra", `aria-label="Buscar obra pelo nome"`,
   clear (X) button when there is text.
2. SegmentedControl `sm` (30px segments): **Em andamento** (default) · **Entregue** · **Todas**.
3. Admin only: outline `sm` button "Gerente: Todos ▾" → DropdownMenu (align start, 264px) with label
   "Gerente responsável" and radio items "Todos os gerentes", then each manager.
4. Outline `sm` button "Ordenar: Mais recentes ▾" → DropdownMenu with label "Ordenar" and radio items
   **Mais recentes** (default) · **Nome A–Z** · **Mais pendências abertas** · **Atividade recente**.
   In the trigger the key ("Gerente:", "Ordenar:") is `--muted-foreground`, the value `--foreground`, gap 6px.
5. When anything is active (search, status ≠ Em andamento, gerente ≠ todos): ghost `sm` "Limpar filtros"
   with `x` icon 16px.

### Toolbar — mobile (sticky)

- `position: sticky; top: 0; z-index: 20`, full-bleed (negative page margin), padding `8px 16px`,
  background `--background`. `border-bottom: 1px solid` is transparent at rest and `--border` once the list
  has scrolled more than 64px.
- SearchInput `md` (44px), flex 1, gap 8px, then an outline `md` button: `sliders-horizontal` 20px +
  "Filtros" + (when > 0) a count Badge (20px round pill, `--primary` bg). `aria-label` "Filtros, 2 ativos".
- Active filter count = (status ≠ Em andamento) + (admin and gerente ≠ todos). **Sort is not a filter.**

### Filter sheet — mobile (Sheet = shadcn `drawer`)

- Bottom sheet over the `--overlay` scrim, radius 14px on top, `--shadow-lg`, 36 × 4 handle, enter 280ms slide.
- Title "Filtros", description "2 filtros ativos" / "1 filtro ativo" / "Nenhum filtro ativo", close X (44px).
- Body, gap 24px:
  - "Status" (14px/500) + SegmentedControl `md` full width (44px segments).
  - Admin: "Gerente responsável" + radio list (44px rows, trailing `check` 18px in `--primary`).
  - "Ordenar" + radio list with the four options.
- Sticky footer, `border-top`: outline "Limpar filtros" (disabled at 0 active) + primary full-width
  "Ver N obras".
- Filters apply immediately (the list behind updates); "Ver N obras" only closes.

### Project card (whole card = one link)

- Card: `--card` bg, radius `--radius-xl` (14px), `box-shadow: --ring-hairline`, padding 16px, no shadow.
- Content, vertical gap 12px:
  1. Top row (`space-between`, `align-items: flex-start`, gap 12px, min-height 52px):
     - Left: **name**, 18px/600, tracking -0.02em, leading 1.3, clamped to 2 lines. Under it, **for
       managers and assistants only**, their role in that obra: "Gerente de obra" or "Assistente de obra",
       14px `--muted-foreground`, 2px gap. Admins don't see a role line (it would be the same on every card).
     - Right: status **Badge** with dot, no shrink: "Em andamento" (tone `primary`: bg `--accent`, text
       `--accent-foreground`) or "Entregue" (tone `neutral`: bg `--secondary`, text `--secondary-foreground`).
       24px tall, 12px/500 text, 6px dot.
  2. Footer row: `border-top: 1px solid --border`, padding-top 12px, `space-between`, baseline, 14px:
     - Left: open pins, 500 weight, tabular numbers: "42 pendências abertas" / "1 pendência aberta" /
       "Nenhuma pendência aberta". Color `--foreground`, or `--muted-foreground` when 0 or the obra is delivered.
     - Right: "Atividade há 25 min" / "há 2 h" / "há 3 dias", `--muted-foreground`.
- **Delivered obra**: quieter, not disabled. Card background transparent (hairline ring only), neutral
  badge, muted pin count. Still opens the obra and can still be exported, but takes no new pins.
- Not on the card: organization name, cover photo, chevron.
- States: hover adds `box-shadow: 0 0 0 1px --input` on the link (radius 14px); focus-visible
  `--shadow-focus`; active `translateY(1px)`. Transition 120ms.

### List layout

- Desktop: `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`, gap 12px → 3 columns at
  1280px, 2 below ~1000px.
- Mobile: one column, gap 12px.
- **Page size 12** (fills 3 × 4 and 2 × 6).
- Main padding: mobile `20px 16px 32px`, gap 16px; desktop `32px 32px 48px`, gap 20px; max-width 72rem.

### Pagination — desktop

- Row under the grid, `space-between`: "Mostrando 13–24 de 26" (14px muted, tabular) + Pagination
  (36px buttons, "Anterior" / "Próxima" with chevrons, at most 7 slots with ellipses).
- Changing page: the target button shows a 14px spinner and becomes current, every control is disabled,
  the grid dims to opacity 0.55 (`aria-busy`). When the page lands, scroll to the top.

### Load more — mobile

- The next 12 load automatically when the list end is within ~160px of the viewport (IntersectionObserver
  on a sentinel in the app).
- Fallback outline full-width button "Carregar mais".
- Loading: centered spinner 18px + "Carregando mais obras…" (14px muted, 44px row, `role="status"`).
- Error: `circle-alert` 18px + "Não foi possível carregar mais obras." + outline full-width
  "Tentar de novo" with `refresh-cw`. Automatic loading stops until the user taps it.

### Nova obra — admin only (managers and assistants never see it)

- **Desktop**: right of the title (see Title row).
- **Mobile**: **fixed bottom bar** (decided). Outside the scroll area, `border-top: 1px solid --border`,
  background `--background`, padding `12px 16px calc(12px + env(safe-area-inset-bottom))`, gap 8px:
  centered "N licenças disponíveis" (14px muted) above a full-width `lg` (52px) primary "Nova obra" with `plus`.
- **Licenses**: only the available count is shown: "2 licenças disponíveis" / "1 licença disponível". A
  license is consumed when an obra is created and does not come back, so the total bought is irrelevant and
  is not shown.
- **No license**: button disabled (50% opacity) and the text becomes "Sem licenças disponíveis. Fale com a
  BluPrint."
- The bar shows while loading, with results, and in no-results. In the admin empty state the action moves
  into the empty block instead.

### Toast — sign-out failed

- Toaster bottom-center on mobile (lifted above the bottom bar, offset 105px), bottom-right on desktop.
- Toast tone `danger`: `circle-alert` icon, "Não foi possível sair. Confira sua conexão e tente de novo.",
  44px close button. `--popover` bg, radius 10px, `--ring-hairline` + `--shadow-lg`, max width 24rem.
  Auto-dismiss ~6s. In the app: `sonner`.

---

## States

Each state exists in light and dark, mobile and desktop, frozen in `screens/obras/Obras QA.dc.html`
(ids O1–O17). Centered blocks (empty, error, offline, no results) share one pattern: max-width 26rem,
centered, gap 16px, padding-block 48px mobile / 64px desktop, icon 24px `--muted-foreground`, title 18px/600
`--foreground`, text 14px muted, then the action.

| Id | State | What shows |
| --- | --- | --- |
| O1 | Carregando | Real header, title and toolbar. The count is a 64 × 18 skeleton; the list is skeleton cards in the same grid (12 desktop, 6 mobile) shaped like the card, so nothing jumps. |
| O2 | Com obras, admin | Mixed statuses, "Nova obra" visible, no role line on cards. |
| O3 | Com obras, gerente / assistente | Role line on each card, no "Nova obra", no gerente filter. |
| O4 | Com obras, admin sem licença | Button disabled + "Sem licenças disponíveis. Fale com a BluPrint." |
| O5 | Vazio, admin | `building` · "Nenhuma obra ainda" · "Crie a primeira obra da construtora para começar a mapear pendências." · `lg` "Nova obra" (full width on mobile) + licenses under it. No toolbar. |
| O6 | Vazio, admin sem licença | Same, button disabled, no-license text. |
| O7 | Vazio, gerente / assistente | `building` · "Nenhuma obra por aqui" · "Você verá uma obra aqui quando o admin da construtora te vincular a ela." No action. |
| O8 | Sem resultados | `search` · "Nenhuma obra encontrada" · "Nenhum resultado para “brisa” em obras em andamento." (the scope follows status and gerente) · outline "Limpar filtros" (clears search, status, gerente). |
| O9 | Erro ao carregar | `circle-alert` · "Não foi possível carregar suas obras" · "Confira sua conexão e tente de novo." · `lg` "Tentar de novo". `role="alert"`. |
| O10 | Sem conexão | `wifi-off` · "Sem conexão." · "Continuamos assim que a internet voltar." No button; resumes on the browser `online` event (TanStack Query `onlineManager`, as in `SessionSplash`). |
| O11 | Carregando mais (mobile) | See Load more. |
| O12 | Erro ao carregar mais (mobile) | See Load more. |
| O13 | Trocando de página (desktop) | See Pagination. |
| O14 | Filtros abertos (mobile) | Sheet with two active filters. |
| O15 | Menu do usuário aberto | See User menu. |
| O16 | Saindo | Spinner on Sair, menu locked. |
| O17 | Falha ao sair | Toast, user stays signed in. |

## State management

- **URL search params** (source of truth): `q`, `status`, `manager`, `sort`, `page`.
- **Server state** (TanStack Query): `useProjectsQuery({ q, status, manager, sort, page, pageSize: 12 })`
  → `{ items, total, availableLicenses }`. Mobile uses `useInfiniteQuery` with the same key minus `page`.
  Search is debounced (~250ms) before it hits the URL and the query.
- **Local UI state**: filter sheet open, user menu open, signing out, toast.
- Role comes from the session: `admin` sees all obras, the gerente filter and Nova obra; others don't.

## What the API serves today vs. what is future

The API returns today the member's projects with id, name and the user's role. Everything else needs a
ticket; until it lands the UI **hides the element** instead of faking it.

| Element | Status |
| --- | --- |
| Obras the user belongs to, name, the user's role | Served |
| Admin sees every obra of the organization | Future |
| Search by name (`q`), server-side | Future |
| Status (Em andamento / Entregue) and its filter | Future — project status field |
| Gerente responsável filter (admin) | Future — responsible manager on the project |
| Sort: Nome A–Z (trivial), Mais pendências abertas, Atividade recente | Future |
| Open pin count | Future — aggregate on pins |
| Last activity | Future — `lastActivityAt` on the project |
| Pagination (`page`, `pageSize`, `total`) | Future |
| Available license count and no-license state | Future — organization licenses (only the available count) |
| Nova obra entry point | Future — form is #46 |
| Profile photo in the Avatar | Future — initials until upload exists |

## Interactions and motion

- Hover 120ms, buttons and inputs 180ms, sheet 280ms, all `cubic-bezier(.2,0,.2,1)` (`--ease-standard`);
  enters use `cubic-bezier(0,0,.2,1)` (`--ease-out`). Fades and short slides only. `prefers-reduced-motion`
  sets durations to 0.
- Press: 1px down (`--press-translate`), never scale.
- Focus-visible: 3px ring `--shadow-focus` + solid `--ring` border.
- Tap targets: 44px minimum, 52px for the mobile primary action. 36px controls only in the desktop toolbar.

## Design tokens (from the BluPrint design system, `.claude/skills/bluprint-design/tokens/`)

**Colors, light / dark**

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#FFFFFF` | `#081830` |
| `--foreground` | `#081830` | `#EDF1F7` |
| `--card` / `--popover` | `#FFFFFF` | `#0E2340` |
| `--primary` | `#0068F0` | `#2E8CFF` |
| `--primary-foreground` | `#FFFFFF` | `#04101F` |
| `--secondary` | `#EDF1F7` | `#16263D` |
| `--secondary-foreground` | `#16263D` | `#EDF1F7` |
| `--muted` | `#F6F8FB` | `#122744` |
| `--muted-foreground` | `#64748B` | `#94A3B8` |
| `--accent` | `#EBF3FE` | `#16324F` |
| `--accent-foreground` | `#0052C2` | `#9FCBFF` |
| `--destructive` | `#D22B2B` | `#FF6B6B` |
| `--border` | `#DDE4ED` | `rgb(255 255 255 / .12)` |
| `--input` | `#C3CDDB` | `rgb(255 255 255 / .22)` |
| `--overlay` | `rgb(8 24 48 / .55)` | `rgb(2 8 18 / .7)` |

**Type**: Geist (`--font-sans`), Geist Mono for ids. 12 / 14 / 16 / 18 / 22 / 28 / 36px
(`--text-xs` … `--text-3xl`). Weights 400 / 500 / 600. Headings tracking -0.02em. Leading 1.15 / 1.3 / 1.5.

**Spacing**: 4px scale (`--space-1` 4px … `--space-16` 64px). Page padding 16px / 32px. Content max 72rem.
Controls 36 / 44 / 52px.

**Radius**: `--radius-sm` 6px · `--radius-md` 8px · `--radius-lg` 10px (buttons, inputs, menus) ·
`--radius-xl` 14px (cards, sheet) · `--radius-full`.

**Elevation**: `--ring-hairline` inset 1px at 10% ink (dark: white 12%) · `--shadow-sm` `0 1px 2px` ·
`--shadow-md` `0 4px 12px rgb(8 24 48 / .10)` · `--shadow-lg` `0 12px 32px rgb(8 24 48 / .16)` ·
`--shadow-focus` `0 0 0 3px rgb(0 104 240 / .35)`.

## Components (design system → shadcn)

| Used here | shadcn primitive |
| --- | --- |
| Button, Card | `button`, `card` (already in the repo) |
| SearchInput | `input` + lucide `search` / `x` |
| Avatar, Badge | `avatar`, `badge` |
| Skeleton, Spinner | `skeleton`, `spinner` (spinner already in the repo) |
| Toast / Toaster | `sonner` |
| DropdownMenu | `dropdown-menu` |
| Sheet | `drawer` |
| Pagination | `pagination` |
| SegmentedControl | `toggle-group` |
| Filter-sheet radio lists | `radio-group` (the prototype draws them with menu items) |

## Assets

No images. Icons are lucide, from `lucide-react`: `search`, `sliders-horizontal`, `x`, `chevron-down`,
`chevron-left`, `chevron-right`, `check`, `log-out`, `sun`, `moon`, `plus`, `building`, `circle-alert`,
`wifi-off`, `refresh-cw`. The logo is `public/brand/logo-lockup*.svg` (already in the repo, `Logo.tsx`).

## Files in this bundle

| Path | What it is |
| --- | --- |
| `screens/obras/Obras.dc.html` | The live Obras screen. Tweak props: `theme`, `viewport`, `role`, `state`, `overlay`, `licensesAvailable`, `signOutResult`, `moreFails` |
| `screens/obras/Obras QA.dc.html` | O1–O17 frozen side by side |
| `screens/obras/HANDOFF.md` | Short version of this README |
| `screens/auth/Entrar.dc.html`, `Criar conta.dc.html` | Recreation of the implemented auth screens (session splash / failure states included) |
| `screens/auth/Auth QA.dc.html` | E1–E8, C1–C6 frozen |
| `screens/auth/HANDOFF.md` | Source files the auth screens were rebuilt from, and two open points |

## Open points

1. The design system's `Logo` has no wordmark-only variant; the mobile auth band crops the stacked logo in
   the prototype. The app already uses `wordmark-white.svg` directly, so nothing to do in `apps/web`, but the
   design system should gain the variant.
2. The Card title sizes differ between Entrar (16px/500) and Criar conta (28px/500) in the current code.
3. The admin empty-state sentence ("Crie a primeira obra da construtora para começar a mapear pendências.")
   was written in this session, not in the brief.
