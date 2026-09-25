One-line: a radio group drawn as a pill track — for 2–4 short options that should all be visible.

```jsx
<SegmentedControl label="Status" value={status} onChange={setStatus}
  options={[{ value: "in_progress", label: "Em andamento" }, { value: "delivered", label: "Entregue" }, { value: "all", label: "Todas" }]} />
```

- In `apps/web`: `bunx shadcn add toggle-group` (type="single").
- Icon-only options need `ariaLabel` ("Tema claro").
