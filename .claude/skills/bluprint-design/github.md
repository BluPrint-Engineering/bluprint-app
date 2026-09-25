repo: BluPrint-Engineering/bluprint-app
branch: main
path: apps/web, docs, CONTEXT.md, CLAUDE.md

## Last sync

date: 2026-09-25T12:00:00Z

### Updated in this project

- Primitives added for the obra list (#45): Avatar, Badge, Skeleton, Toast, DropdownMenu, Sheet, Pagination, SegmentedControl, SearchInput.
- Screens (#42, #43) moved out to the screens project; this project is now only the design system.

## Screen map

| File | Built from |
| --- | --- |
| `tokens/*.css`, `css/components.css` | `apps/web/src/styles/globals.css`, `components.json`, `apps/web/src/components/ui/{button,card}.tsx`, issue #41 |
| `components/**` | shadcn primitives (radix-nova), issues #42/#43/#45 |
| `tokens/domain-palettes.css`, `guidelines/colors-{status,discipline}.card.html` | `docs/requisitos.md` (Paleta), ADR-0035, ADR-0028 |
| `assets/logo-*.svg` | `assets/bluprint-*-original.webp` (traced) |

## Sync history

- 2026-09-14T20:45:00Z — token set, Button/Card, form/feedback/icon/logo primitives, auth screens (#41, #42, #43).
