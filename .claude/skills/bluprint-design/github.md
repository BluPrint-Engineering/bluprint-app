repo: BluPrint-Engineering/bluprint-app
branch: main
path: apps/web, docs, CONTEXT.md, CLAUDE.md

## Last sync

date: 2026-09-14T20:45:00Z
tree: d511566b98ef

### Updated in this project

- Token set written from `apps/web/src/styles/globals.css` (radix-nova, Geist, `--radius:0.625rem`), rebased on the logo's blues with a light and a dark theme.
- Domain palettes (unit status, discipline) lifted verbatim from `docs/requisitos.md` and kept separate from UI color, per ADR-0035.
- `Button` and `Card` recreated from `apps/web/src/components/ui/`; form, feedback, icon and logo primitives added for issues #42/#43.
- UI kit recreating the login (#42) and signup (#43) screens, pt-BR, mobile-first with a denser desktop split.

Scope note: #41 + #42 + #43 only. The obra dashboard (RF-801/804/808) and the plan viewer are deliberately not designed yet.

## Screen map

| Screen / file | Built from |
| --- | --- |
| `ui_kits/bluprint-web/LoginScreen.jsx`, `login.html` | issue #42, RF-125, RNF-04/05/06, `apps/web/src/components/ui/button.tsx` |
| `ui_kits/bluprint-web/SignupScreen.jsx`, `InviteDialog.jsx`, `signup.html` | issue #43, RF-130/131/132/133 |
| `ui_kits/bluprint-web/ProjectsScreen.jsx` | RF-134 (thin: issues #44/#45 unrefined) |
| `tokens/*.css`, `css/components.css` | `apps/web/src/styles/globals.css`, `components.json`, `apps/web/src/components/ui/{button,card}.tsx`, issue #41 |
| `tokens/domain-palettes.css`, `guidelines/colors-{status,discipline}.card.html` | `docs/requisitos.md` (Paleta), ADR-0035, ADR-0028 |
| `assets/logo-*.svg` | `uploads/bluprint-*.webp` (traced) |
