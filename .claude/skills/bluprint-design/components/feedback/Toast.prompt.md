One-line: sonner-style toast — use for an action's outcome when there is no form to hold an Alert (e.g. sign-out failed).

```jsx
<Toaster position="bottom-center">
  <Toast tone="danger" onDismiss={close}>Não foi possível sair. Confira sua conexão e tente de novo.</Toast>
</Toaster>
```

- In `apps/web`: `bunx shadcn add sonner`, then `toast.error("…")` — this component documents the look.
- Icon + text, never color alone. Errors inside a form use `Alert`, not a toast.
- Mobile: bottom-center, above any fixed action bar (`offset`). Desktop: bottom-right.
