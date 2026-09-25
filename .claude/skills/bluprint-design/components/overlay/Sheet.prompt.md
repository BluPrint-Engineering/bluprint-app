One-line: bottom sheet for mobile — header with a 44px close, scrolling body, sticky footer with the actions in thumb reach.

```jsx
<Sheet open={open} onClose={close} title="Filtros" description="2 filtros ativos"
  footer={<><Button variant="outline" size="lg">Limpar filtros</Button><Button size="lg" block>Mostrar 12 obras</Button></>}>
  …
</Sheet>
```

- In `apps/web`: `bunx shadcn add drawer` (vaul) for the drag-to-dismiss. Slides up in 280ms, no bounce.
- The primary footer button counts out loud what it will show ("Mostrar 12 obras").
