# Handoff — visual foundation (#41) and the auth screens (#42, #43)

This folder is the BluPrint design system. It ships three things: the **visual foundation** of issue
[#41](https://github.com/BluPrint-Engineering/bluprint-app/issues/41), and reference designs for
[#42 (login)](https://github.com/BluPrint-Engineering/bluprint-app/issues/42) and
[#43 (signup)](https://github.com/BluPrint-Engineering/bluprint-app/issues/43). Nothing else — the plan
viewer, the obra dashboard and the report are not designed yet, on purpose.

Read `readme.md` first: it is the rulebook (voice, color, type, spacing, touch, motion, iconography,
brand assets) and every decision in it is traced back to the repo or to a requirement id.

## These files are design references, not production code

The `.jsx` components and `.html` screens here are **prototypes in plain browser React**, built to show the
intended look and behavior. They are not the code to ship. The job in `apps/web` is to **rebuild these
designs with the stack the repo already has** — Vite + TanStack Router + Tailwind v4 + shadcn (radix-nova),
`lucide-react`, `@fontsource-variable/geist` — using `bunx shadcn add` for each primitive rather than pasting
these files in.

**Fidelity: high.** Colors, type, spacing, radii, states, motion and copy are final. Match them.

What *does* transfer verbatim:

| Transfers as-is | Rebuild in the app's stack |
| --- | --- |
| `tokens/*.css` — the CSS custom properties, both themes | `components/**/*.jsx` — rebuild as shadcn components |
| `assets/` — logos, wordmarks, the 18 lucide glyphs | `ui_kits/bluprint-web/*.html` — rebuild as routes |
| `css/base.css` — resets, body, headings, link colors | `css/components.css` — Tailwind classes instead |
| `readme.md` — the rules themselves | |

## Where each piece lands in `apps/web`

```
apps/web/src/styles/globals.css   ← tokens/*.css merged into the @theme block (see below)
apps/web/src/components/ui/       ← Button, Card (already there), + Input, Label, Field,
                                    Checkbox, Alert, Spinner via `bunx shadcn add`
apps/web/src/components/brand/    ← Logo, reading from public/brand/
apps/web/public/brand/            ← assets/logo-*.svg, wordmark*.svg
apps/web/src/routes/entrar.tsx    ← ui_kits/bluprint-web/LoginScreen.jsx  (#42)
apps/web/src/routes/cadastro.tsx  ← ui_kits/bluprint-web/SignupScreen.jsx (#43)
apps/web/src/components/auth/     ← AuthShell (the band + form shell, shared by both routes)
```

Icons come from `lucide-react` by the same kebab-case names listed in `readme.md` — the SVGs in
`assets/icons/` exist only so these prototypes can render without npm.

### Tokens into Tailwind v4

`tokens/` is split by concern for readability; `globals.css` wants them in one place. Keep the **names**
(`--primary`, `--brand-blue`, `--status-released`, `--tap-min`, `--press-translate`, …) — the screens, the
rules and this handoff all refer to them by name. The light theme sits on `:root`, the dark theme on `.dark`,
exactly as the file already does. `--font-sans` / `--font-mono` map to the Geist fontsource imports.

The two domain palettes in `tokens/domain-palettes.css` stay a separate block and never get aliased into UI
tokens (ADR-0035): blue as *hidráulica* and blue as `--primary` are different blues on purpose.

## Acceptance criteria already answered by these designs

- **#42** — email + password, client-side validation with pt-BR messages, show/hide password as a 44px
  icon button, API errors translated from `error.problem.code` into a banner (never API text, ADR-0047),
  loading state on the submit button that does not flash the form. No link to signup: the footer is plain
  muted text, "Não tem conta? O acesso é por convite da sua construtora."
- **#43** — reachable **only from the invite link** (RF-106, RF-130); there is no route in from Entrar and
  no signup without an invite. The invite states the construtora, the obra and the role before the form,
  and the e-mail is fixed to the invited address. `cadastro.tsx` should reject a missing or invalid invite
  token rather than render an empty form.
- **Both** — mobile-first single column below 900px with the brand band on top; a 44%/56% split above it.
  44px minimum tap target, 52px for the primary action. Light and dark themes ship together.
- The frozen states are in `ui_kits/bluprint-web/loading.html` and `state.html` — use them as the QA list.

`ui_kits/bluprint-web/README.md` documents the screens, their states and what is demo data.

## Known gaps

- `ProjectsScreen.jsx` is deliberately thin: the obra list is #44/#45 and unrefined.
- No Toast, Tabs, Table, Avatar or Dialog primitive — no specified screen needs one yet.
- The pin marker, the discipline legend and the unit status cell are domain objects that belong in this
  system, but they wait for the plan viewer and dashboard specs.
- The Miro board referenced in `docs/data-model.md` was never accessible; if it holds screen designs, they
  should be reviewed against these.
