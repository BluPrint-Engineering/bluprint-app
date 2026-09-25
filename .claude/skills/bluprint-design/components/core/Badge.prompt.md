One-line: a status pill with text — use it for obra status and counts, never as a colored dot alone.

```jsx
<Badge tone="primary" dot>Em andamento</Badge>
<Badge tone="neutral" icon={<Icon name="circle-check" size={14} />}>Entregue</Badge>
<Badge count>2</Badge>
```

- UI tones only. Unit status and discipline colors are domain palettes and never go in a Badge (ADR-0035).
- A finished thing (obra entregue) is `neutral` — quieter, not disabled.
