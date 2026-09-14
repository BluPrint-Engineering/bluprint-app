# BluPrint Design System

BluPrint is construction-site management software. Engineers and engineering assistants map site issues as **pins over floor plans**, grouped by unit and by discipline, and export PDF reports for the crews who do the work. The person using it is **standing inside an unfinished apartment holding a phone**, possibly wearing a glove, in direct sun — that single fact drives most of the decisions in this system.

This design system was built for [issue #41 — *1.6 Fundação visual: tokens, tipografia e componentes base*](https://github.com/BluPrint-Engineering/bluprint-app/issues/41), and it covers the two screens that depend on it: [#42 login](https://github.com/BluPrint-Engineering/bluprint-app/issues/42) and [#43 signup](https://github.com/BluPrint-Engineering/bluprint-app/issues/43).

## Sources this was built from

| Source | What came from it |
| --- | --- |
| [`BluPrint-Engineering/bluprint-app`](https://github.com/BluPrint-Engineering/bluprint-app) (`main`) | The whole system. `apps/web/src/styles/globals.css` (shadcn **radix-nova**, Geist, `--radius:0.625rem`), `apps/web/src/components/ui/{button,card}.tsx`, `components.json` (lucide icons), `CLAUDE.md`, `CONTEXT.md`, `docs/requisitos.md`, `docs/data-model.md`, `docs/adr/` |
| Issues [#41](https://github.com/BluPrint-Engineering/bluprint-app/issues/41), [#42](https://github.com/BluPrint-Engineering/bluprint-app/issues/42), [#43](https://github.com/BluPrint-Engineering/bluprint-app/issues/43) | Acceptance criteria for the foundation and the two auth screens |
| `uploads/bluprint-full-logo.webp`, `uploads/bluprint-logo.webp` | The brand. Colors were sampled pixel-by-pixel from these files; the vector marks in `assets/` are traced from them |
| [Miro board](https://miro.com/app/board/uXjVHrUOxfg=/) (referenced in `docs/data-model.md`) | **Not read** — no access. If it holds screen designs, it should be reviewed against this system |

Read the repository if you are going to design for BluPrint: `docs/requisitos.md` is the product's source of truth (pt-BR, `RF-xxx` ids), `CONTEXT.md` is the glossary that decides what things are called, and `docs/adr/` records why each decision went the way it did. The product is **specified far ahead of what is built** — at the time of writing, `apps/web` contains only a health-check page, one Button and one Card.

## Products and surfaces

One product, one codebase: a **mobile-first React web app** (Vite + TanStack Router + Tailwind v4 + shadcn radix-nova), used on a phone in the field and on a desktop in the office, installable as a PWA (ADR-0037, RNF-01/02/20). There is no marketing site and no native app in the repo. Three surfaces exist on paper:

1. **Field app** — plan viewer with pins, unit sheets, pin creation. *Not designed yet; no screens exist in the repo.*
2. **Office app** — dashboards (unit map by status, common-area strip), project structure, people, contractors. *Specified in RF-8xx / RF-2xx, not built.*
3. **Worker report** — the PDF, the only artifact that leaves the platform. Carries BluPrint's brand, must stay legible printed in black and white (ADR-0034, RF-704).

The only surface with a refined spec today is authentication, and that is what `ui_kits/bluprint-web/` recreates.

## Index

| File | What it is |
| --- | --- |
| `styles.css` | The single entry point. Nothing but `@import` lines |
| `tokens/` | `colors.css` (brand + light/dark UI), `domain-palettes.css` (unit status, discipline), `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css`, `fonts.css` |
| `css/` | `base.css` (resets, body, headings, links), `components.css` (the `.bp-*` classes the components use) |
| `assets/` | Vector logos (`logo-mark*.svg`, `wordmark*.svg`, `logo-lockup*.svg`, `logo-stacked*.svg`), the two raster originals, `icons/` (18 lucide glyphs) |
| `components/core/` | **Button**, **Card** (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), **Icon** |
| `components/forms/` | **Field**, **Input**, **Label**, **Checkbox** |
| `components/feedback/` | **Alert**, **Spinner** |
| `components/brand/` | **Logo** |
| `ui_kits/bluprint-web/` | Click-through recreation of Entrar / Criar conta + the post-login obra list, plus `mobile.html` (the same screens at 402 px in phone frames) and `loading.html` (every loading state, web and mobile). See its own README |
| `guidelines/` | The foundation specimen cards rendered in the Design System tab |
| `SKILL.md` | Agent-skill front matter, so this folder works as a Claude Code skill |
| `HANDOFF.md` | What to do with all of this in `apps/web` — where each piece lands, what transfers verbatim, what gets rebuilt |
| `github.md` | Source-repo association and sync record |

### Component inventory, and why it is this size

`apps/web` defines exactly **two** components today: `Button` and `Card`. Both are recreated here with the same values (`rounded-lg`, hairline `ring-1`, 1px press nudge, 3px focus ring, tinted-not-solid destructive).

**Intentional additions** — each one is required by the acceptance criteria of #42/#43 and would be added to `apps/web` with `bunx shadcn add`:

- **Input, Label, Field, Checkbox** — #42 and #43 are forms with client-side validation and translated error messages; `Field` exists so an error is always icon + text and never a red border alone (RNF-07).
- **Alert** — "erro da API é traduzido antes de exibir" needs a banner.
- **Spinner** — "estado de carregamento enquanto a sessão é consultada, sem piscar conteúdo".
- **Icon** — a wrapper over the lucide glyphs in `assets/icons/`, matching `iconLibrary: "lucide"` in `components.json`.
- **Logo** — the brand mark, so no screen retypes or redraws it.

Nothing else was invented. There is no Toast, Tabs, Avatar, Dialog primitive or Table here, because no screen in the repo asks for one yet. When the plan viewer and dashboards get specs, the pin, the status cell and the discipline legend become components — they are domain objects with their own palettes and belong here, not in a screen.

## Content fundamentals

**Two languages, one rule.** Interface text is **pt-BR**; code, comments, docs and API messages are English (`CLAUDE.md`). So every label, button and message a user reads is Portuguese, and every prop name and token is English. Never mix the two in one string.

**The API never returns display text.** `message` and `detail` are English developer text; the client branches on `error.problem.code` and writes the pt-BR sentence itself (ADR-0047, `.claude/rules/web.md`).

**Voice.** Plain, second person ("você"), sentence case, verb first on actions. No exclamation marks, no jokes, no emoji anywhere — not in the interface, not in the report. The product speaks like a competent colleague on site, not like a consumer app.

- Buttons: **Entrar** · **Criar conta** · **Novo pin** · **Gerar relatório** · **Atualizar** — verb, one or two words.
- Labels: **E-mail** · **Senha** · **Nome completo** · **Observações (opcional)** — the noun, sentence case; optional fields are marked, required ones are not.
- Errors name the problem, not the system: **"E-mail ou senha incorretos."** · **"A senha precisa de pelo menos 8 caracteres."** Never "Erro 401" and never "Ops!".
- Empty states say who fills the gap: **"Você verá uma obra aqui quando o admin da construtora te vincular a ela."**
- Absence is stated, never silent: a unit with no contractor reads **"sem empresa"**, not a blank cell (RF-307).
- Use the glossary's words, always: *obra* (not projeto/site), *unidade*, *disciplina*, *planta*, *pin*, *pendência*, *empresa executora*, *gerente de obra*, *assistente de obra*, *obreiro*. Avoided synonyms are listed in `CONTEXT.md` and they are avoided on purpose.
- Numbers are counted out loud: **"4 pendências abertas"**, **"12 pins, 8 fotos, 2 plantas"** — a confirmation says exactly what will be lost (RF-214).

## Visual foundations

**The brand is one blue and one navy.** Sampled from the logo: `#0A8CFE` light, `#0068F0` core, `#0040E8` deep, `#081830` ink. The gradient (`--brand-gradient`, 155°, light → deep) belongs to the mark and to brand surfaces — the auth panel, the report cover. It never appears behind UI content, and there is no second accent hue.

**Color.** `--primary` is the brand blue; neutrals are cool, tinted toward the ink, so white surfaces read slightly blue-grey rather than warm. Light theme: white page, white cards, `#DDE4ED` borders. Dark theme: `#081830` page, `#0E2340` cards, primary lifted to `#2E8CFF` so it survives on navy. Both themes ship — the app toggles `.dark` on the root, exactly as `globals.css` does.

**Domain palettes are not UI colors.** Unit status paints a dashboard cell (orange, red, purple, green, plus an unfilled cell with a `#CBD5E1` outline for *em checklist*); discipline paints a pin on a plan (blue plumbing, amber electrical, gray for a completed pin). They live in `tokens/domain-palettes.css`, in separate objects, and never carry UI meaning (ADR-0035, issue #41). Blue as *hidráulica* and blue as *primary* are two different blues on purpose: one is on a plan, one is on a control.

**Never color alone.** Every status, discipline and error carries a label, an icon or a legend beside it (RNF-07). The report has to survive a black-and-white printer in a worker's hand.

**Type.** Geist, one family, for everything — the same face the codebase already ships (`@fontsource-variable/geist`); Geist Mono for unit numbers, coordinates and ids. The wordmark is not type at all, it is vector, so no display face is needed anywhere. Scale is mobile-first and starts at 16px for body — nothing below 14px except a legend (`--text-2xs`, 11px). Headings are 600 with `-0.02em` tracking; labels and buttons 500; body 400. No italics, no all-caps, no letter-spaced small caps.

**Spacing and layout.** 4px base scale. Forms cap at `--content-max` 26rem so the whole form is inside one-handed reach; dashboards cap at 72rem. Page padding is 16px on mobile, 32px on desktop. Mobile is a single column with a sticky header; desktop is the same app, denser — more columns, 36px controls allowed in toolbars, never in the field.

**Mobile is a browser, not an app shell.** The product runs in the phone's browser (PWA later), so the top of the viewport belongs to the browser: anything fixed at the top respects `env(safe-area-inset-top)` and lives inside the page's own header band, never floating over the first 56px. On a 390px screen the card frame is dropped — the form sits directly on the page — and the logo becomes a **white circular badge** holding the gradient mark, with the wordmark in white below it. The badge is the mobile brand treatment: it gives the mark a focal point against the blue band and matches the installed home-screen icon. **In dark mode the band is not inverted, it is dimmed** — `--brand-band` drops to a deep navy gradient and `--brand-badge-surface` goes dark with `--brand-badge-shadow` becoming a lit blue ring, so the badge keeps its presence without being the brightest object on a night screen. The mark inside switches to the white version.

**The band gradient is aimed at the box, not at a fixed angle.** `--brand-band` runs `to bottom right`, so the light corner sits top-left and the deep corner bottom-right on any shape — a 402×204 phone header and a tall desktop panel read identically. A fixed `155deg` flattens out on a wide short band, which is why the token does not simply reuse `--brand-gradient`.

**How the band ends is themed, because the band sits at a different distance from the page in each theme:**

- **Dark** — band bottom `#07182E` against page `#081830`: neighbours. `--brand-band-bleed` dissolves the seam over the last 36px, measured from the bottom edge so it always clears the wordmark.
- **Light** — saturated blue against white: opposites. Fading between them travels through a washed-out pale blue that reads as a printing error, so light mode does **not** fade: the band ends on a straight edge and the corner-to-corner gradient carries the depth on its own.

`--brand-band-pad` carries the extra bottom room the fade needs (40px dark, 24px light). Never start a fade high enough to cross the wordmark — white type on a washed-out ground fails contrast. The horizontal lockup is a desktop-only asset.

**Touch.** 44px is the floor for anything tappable (`--tap-min`), 52px for the primary action, 44px square for icon buttons. This is the one rule that overrides visual density anywhere a gloved hand is involved (RNF-06).

**Backgrounds.** Flat color. No photography, no illustration, no pattern, no texture, no grain — the interesting image on screen is always the floor plan, and nothing competes with it. The only non-flat surface in the system is the brand gradient panel. Plans render on `--field-surface` (white, and still white in dark mode) because a plan is a white sheet with thin lines and inverting it destroys it.

**Borders, radii, elevation.** Hairline ring (`--ring-hairline`, 1px at 10% ink) separates a card from the page — radix-nova's choice, kept. `--radius` is 10px: buttons and inputs `--radius-lg` (10px), cards `--radius-xl` (14px), small controls `--radius-md` (8px), pills `--radius-full`. Shadows mean *floating over something*: `--shadow-md` for sheets and popovers, `--shadow-lg` for dialogs, `--shadow-sm` for a lifted row. A flat card never gets a shadow.

**States.** Hover darkens the primary by 12% in oklch and fills ghost/outline with `--muted`; press nudges the element **1px down** (`--press-translate`, copied from `button.tsx`), never scales it; focus-visible draws a 3px brand-blue ring at 35% plus a solid border; disabled is 50% opacity with pointer events off; invalid turns the border `--destructive` and adds a red ring at 25%. Destructive actions are *tinted* buttons (10% red background, red text), never solid red.

**Motion.** 120ms for hover and checkbox, 180ms for buttons and inputs, 280ms for sheets and plan zoom, all on `cubic-bezier(.2,0,.2,1)`. Fades and short slides only — no bounce, no spring, no parallax. `prefers-reduced-motion` sets every duration to 0.

**Transparency and blur.** Almost never. Dark-theme borders are white at 12%, the modal scrim is ink at 55%, and that is the whole list. No frosted glass: a blurred panel over a floor plan hides the drawing.

**Imagery.** The only images in the product are user-uploaded: floor plans (white, high-contrast, untinted) and pin photos of site defects (shown as-is; never filtered, never color-graded). There is no stock photography and no brand illustration.

## Iconography

**Lucide**, at its default 24px box and 1.5px stroke — the app declares `iconLibrary: "lucide"` in `components.json` and imports `lucide-react`. The 18 glyphs the screens here need were copied from the [lucide repository](https://github.com/lucide-icons/lucide) into `assets/icons/`: `eye`, `eye-off`, `mail`, `lock`, `user`, `circle-alert`, `circle-check`, `map-pin`, `chevron-right`, `log-out`, `plus`, `arrow-left`, `sun`, `moon`, `hard-hat`, `refresh-cw`, `wifi-off`, `building`. Need another? Copy the SVG from lucide by its kebab-case name; do not draw one.

Rules: icons are 20px inline and 24px inside a 44px tap target; they inherit `currentColor` (the `Icon` component uses a CSS mask to keep that behavior); an icon never stands alone as the only signal of state; **no emoji and no unicode glyphs as icons**, anywhere, including the report. There is no icon font and no sprite sheet in the repo.

## Brand assets

`assets/bluprint-lockup-original.webp` and `assets/bluprint-mark-original.webp` are the files you provided — the reference. Everything else is **vector, traced from them by measurement**:

| File | What it is |
| --- | --- |
| `logo-mark.svg` + `-blue`, `-ink`, `-white`, `-mono` | The pin mark. `-mono` inherits `currentColor` |
| `wordmark.svg` + `-blue`, `-ink`, `-white`, `-mono` | "bluprint" as **geometry, not type** — monoline strokes 42 units wide, circular bowls, x-height 146, ascender 190, descender 51, baseline at y=265 in a 896×320 box |
| `logo-lockup.svg` + `-white`, `-ink`, `-blue` | Mark left, wordmark right |
| `logo-stacked.svg` + `-white`, `-ink` | Mark above the wordmark, the arrangement of the original file |

The wordmark carries no font dependency, so it renders identically in the app, in a PDF and in a design tool. Two known simplifications against the raster: the mark's ribbon shading is reduced to one gradient plus a highlight, and the letterforms are reconstructed from measured circles and stems — within a couple of units of the original at every point, but not a curve-for-curve copy of the designer's file. For print at large scale, the raster original is still the safest source.

Clear space around the mark is one counter-circle radius on every side. Minimum mark height: 24px on screen. Never recolor the mark outside the four tones provided, never place the gradient mark on a mid-blue background (use `-white`), never stretch or rotate it.
