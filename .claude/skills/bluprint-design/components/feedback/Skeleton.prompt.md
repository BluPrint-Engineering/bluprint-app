One-line: loading placeholder — build a skeleton of the real layout (same grid, same card), never a centered spinner over an empty page.

```jsx
<Card aria-busy="true"><CardHeader><Skeleton width="60%" height={20} /><Skeleton width="40%" height={14} /></CardHeader></Card>
```

- Mark the container `aria-busy="true"` and give the region an accessible "Carregando…" label; Skeleton itself is aria-hidden.
- Pulses at 1.4s; still under `prefers-reduced-motion`.
