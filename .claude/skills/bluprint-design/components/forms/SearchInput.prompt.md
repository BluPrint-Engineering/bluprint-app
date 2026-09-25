One-line: the search field — search icon left, clear X right; give it an aria-label since it has no visible Label.

```jsx
<SearchInput aria-label="Buscar obra pelo nome" placeholder="Buscar obra" value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ("")} />
```

- Debounce ~250ms before writing to the URL (?q=). Mobile keeps 16px text so iOS does not zoom.
