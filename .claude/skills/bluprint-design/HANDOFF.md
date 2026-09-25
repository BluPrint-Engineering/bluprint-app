# Handoff — BluPrint design system (#41)

This folder is the BluPrint design system: tokens, the `.bp-*` component styles, the primitives and the brand
assets. It covers the **visual foundation** of issue
[#41](https://github.com/BluPrint-Engineering/bluprint-app/issues/41). Screens are not here; they live in the
screens project, each with its own handoff.

Read `readme.md` first: it is the rulebook (voice, color, type, spacing, touch, motion, iconography,
brand assets) and every decision in it is traced back to the repo or to a requirement id.

## These files are design references, not production code

The `.jsx` components here are **prototypes in plain browser React**, built to show the intended look and
behavior. The job in `apps/web` is to **rebuild them with the stack the repo already has**: Vite + TanStack
Router + Tailwind v4 + shadcn (radix-nova), `lucide-react`, `@fontsource-variable/geist`, using
`bunx shadcn add` for each primitive rather than pasting these files in.

**Fidelity: high.** Colors, type, spacing, radii, states and motion are final. Match them.

| Transfers as-is | Rebuild in the app's stack |
| --- | --- |
| `tokens/*.css`: the CSS custom properties, both themes | `components/**/*.jsx`: rebuild as shadcn components |
| `assets/`: logos, wordmarks, the 24 lucide glyphs | `css/components.css`: Tailwind classes instead |
| `css/base.css`: resets, body, headings, link colors | |
| `readme.md`: the rules themselves | |

## Where each piece lands in `apps/web`

```
apps/web/src/styles/globals.css   ← tokens/*.css merged into the @theme block (see below)
apps/web/src/components/ui/       ← one shadcn primitive per component (table below)
apps/web/src/components/brand/    ← Logo, reading from public/brand/
apps/web/public/brand/            ← assets/logo-*.svg, wordmark*.svg
```

| Component here | shadcn primitive |
| --- | --- |
| Button, Card | `button`, `card` (already in the repo) |
| Input, Label, Field, Checkbox | `input`, `label`, `field`, `checkbox` |
| SearchInput | `input` + lucide `search` / `x` |
| Alert, Spinner, Skeleton | `alert`, `spinner`, `skeleton` |
| Toast (Toaster) | `sonner` |
| Avatar, Badge | `avatar`, `badge` |
| DropdownMenu | `dropdown-menu` |
| Sheet | `drawer` (bottom sheet on mobile) |
| Pagination | `pagination` |
| SegmentedControl | `toggle-group` |

Icons come from `lucide-react` by the same kebab-case names listed in `readme.md`. The SVGs in
`assets/icons/` exist only so the prototypes can render without npm.

### Tokens into Tailwind v4

`tokens/` is split by concern for readability; `globals.css` wants them in one place. Keep the **names**
(`--primary`, `--brand-blue`, `--status-released`, `--tap-min`, `--press-translate`, …): the screens,
the rules and this handoff all refer to them by name. The light theme sits on `:root`, the dark theme on
`.dark`, exactly as the file already does. `--font-sans` / `--font-mono` map to the Geist fontsource imports.

The two domain palettes in `tokens/domain-palettes.css` stay a separate block and never get aliased into UI
tokens (ADR-0035): blue as *hidráulica* and blue as `--primary` are different blues on purpose.

## Known gaps

- No Tabs, Table or Dialog primitive: no specified screen needs one yet.
- The pin marker, the discipline legend and the unit status cell are domain objects that belong in this
  system, but they wait for the plan viewer and dashboard specs.
- The Miro board referenced in `docs/data-model.md` was never accessible; if it holds screen designs, they
  should be reviewed against this system.
