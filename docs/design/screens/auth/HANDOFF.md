# Handoff — Entrar (#42) e Criar conta (#43)

These two screens already exist in `apps/web`. The files here are a **recreation of the implemented code**,
not a new design: the kit that used to live in `.claude/skills/bluprint-design/ui_kits/bluprint-web/` is no
longer in the repo, so they were rebuilt from the source below and from the linked BluPrint design system.

| File | What it is |
| --- | --- |
| `Entrar.dc.html` | Login screen + the session splash / session-failed screens (props: `theme`, `viewport`, `state`) |
| `Criar conta.dc.html` | Signup screen (same props) |
| `Auth QA.dc.html` | Every state frozen side by side: mobile 390 × 844 and desktop 1280 × 800, light and dark |

## Source it was rebuilt from

| Screen part | `apps/web/src/…` |
| --- | --- |
| Band + form column, breakpoint 900px, flat form on mobile / card on desktop | `features/auth/components/AuthShell.tsx` |
| Login form, copy, validation, error alert, footer | `features/auth/LoginPage.tsx`, `signInErrorMessage.ts` |
| Signup form, password rules, terms, "Já tem conta?" | `features/auth/SignupPage.tsx`, `signUpErrorMessage.ts`, `packages/shared/src/auth/password-policy.ts` |
| Show/hide password | `features/auth/components/PasswordInput.tsx` |
| Theme toggle in the band | `features/auth/components/ThemeToggle.tsx` |
| "Verificando sua sessão…" / "Sem conexão." | `features/auth/components/SessionSplash.tsx` |
| "Não foi possível verificar sua sessão" | `features/auth/components/SessionCheckFailed.tsx` |
| Card title sizes (16px/500 on Entrar, 28px/500 on Criar conta) | `components/ui/card.tsx` + the pages' `className` |

## States (QA ids)

Entrar — E1 vazio · E2 validação no cliente · E3 e-mail ou senha incorretos · E4 muitas tentativas ·
E5 entrando · E6 verificando sessão · E7 verificando sessão sem conexão · E8 falha ao verificar sessão.

Criar conta — C1 vazio · C2 validação no cliente · C3 senha fácil de adivinhar · C4 e-mail já cadastrado
(with the inline "Entrar" link) · C5 senha vazada · C6 criando conta.

## Flow

- Entrar → on success goes to `../obras/Obras.dc.html` (the old `ProjectsScreen.jsx` is gone). In the app
  this is `router.history.push(redirect ?? "/")`, and `/` redirects to `/projects` (see the Obras handoff).
- In the prototype an e-mail containing "gerente" or "assistente" opens Obras as a manager; any other as
  admin. Password `errada` shows E3. On Criar conta, an e-mail starting with `usado@` shows C4.

## Nothing to change in `apps/web`

The code is the reference; these files match it. Two points worth a decision, not bugs:

1. **Card title sizes differ** between the two screens (16px on Entrar, 28px on Criar conta) because
   `SignupPage` overrides `text-2xl` and `LoginPage` keeps the shadcn default. Recreated as is.
2. **The design system's `Logo` has no wordmark-only variant.** The mobile band shows the white wordmark
   under the badge (`/brand/wordmark-white.svg` in the app). Here it is the bottom of `Logo stacked tone="white"`
   cropped to the wordmark, so no asset is copied. The clean fix belongs in the design system
   (`Logo wordmarkOnly` or `variant="wordmark"`), not in this project.
