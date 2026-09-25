# UI kit — BluPrint web app

Recreation of the two screens specified in the repo's visual-foundation epic:

| Screen | Issue | Files |
| --- | --- | --- |
| Entrar | [#42 — 1.7 Tela de login](https://github.com/BluPrint-Engineering/bluprint-app/issues/42) | `LoginScreen.jsx`, `login.html` |
| Criar conta | [#43 — 1.8 Tela de cadastro](https://github.com/BluPrint-Engineering/bluprint-app/issues/43) | `SignupScreen.jsx`, `InviteDialog.jsx`, `signup.html` |

Nobody signs up alone: an account only exists after an invitation (RF-106, RF-130). Entrar has no signup link — its footer only says access is by invitation — and Criar conta is reachable **only from the invite link**, always with an invite.

`index.html` is the click-through: session check → Entrar → obra list. The dashed **Demo · abrir link do convite** button (bottom-right, demo only, not product UI) stands in for the e-mailed link: → Criar conta → (invite dialog) → obra list.

`mobile.html` shows the same two screens at 402 px inside phone frames — same files, no separate mobile build.

`loading.html` freezes the three loading states side by side, web and mobile, with a theme toggle: session check, Entrar mid-request, Criar conta mid-request. `state.html?state=session|login|signup&theme=light|dark` is the single-state mount it embeds.

## What is real and what is stand-in

- **Real** — every layout, token and component decision, the pt-BR copy, the acceptance criteria from #42 (client-side validation, translated API error, loading state without content flash), the invite flow of RF-130, and the obra list of RF-134.
- **Stand-in** — the obra list (`ProjectsScreen.jsx`) is deliberately thin: it belongs to issues [#44](https://github.com/BluPrint-Engineering/bluprint-app/issues/44) and [#45](https://github.com/BluPrint-Engineering/bluprint-app/issues/45), which have no refined spec yet. Nothing here recreates the plan viewer, pins or dashboards — those screens do not exist in the repo.
- `senha` **obra1234** logs in; any other password shows the translated credential error.

## Layout rule

**Mobile is the real case** — a phone browser, in the field. Under 900px: gradient band with the mark in a **white circular badge** (72px, soft shadow) over the wordmark in white — the badge also previews what the home-screen icon looks like once the app is installed (in dark mode the band dims and the badge becomes a lit blue ring — see `--brand-band` / `--brand-badge-*`). The band gradient is aimed `to bottom right`, so it runs light corner to deep corner whatever the box shape — the wide short header and the tall desktop panel both read the same way. In dark mode the band additionally dissolves into the page (`--brand-band-bleed`, last 36px, starting below the wordmark); in light mode it ends on a straight edge and lets the gradient carry the depth. the theme toggle inside the band below `env(safe-area-inset-top)` (never floating over the browser's own chrome), and the form **flat on the page** — no card frame, which only adds noise at 390px — with a 52px primary action. `mobile.html` previews both screens inside a phone browser, URL bar included.

From 900px the same markup becomes the two-column split: brand panel left with the **horizontal** lockup and the tagline, 26rem card right, toggle at the top-right of the form column. Same components, same copy, denser desktop (RNF-02).
