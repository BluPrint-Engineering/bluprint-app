One-line: desktop page numbers — Anterior · 1 … 4 5 6 … 12 · Próxima, 36px controls.

```jsx
<Pagination page={page} pageCount={4} onPageChange={p => navigate({ search: s => ({ ...s, page: p }) })} loadingPage={pending} />
```

- In `apps/web`: `bunx shadcn add pagination`; render the pages as TanStack Router `<Link search>` so the page lives in the URL.
- Desktop only. On a phone, the list loads the next page at its end with a "Carregar mais" fallback.
