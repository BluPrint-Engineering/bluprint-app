# A folder per page in `features/`, a folder per route in `routes/`

Each page gets its own folder inside its feature: `features/auth/LoginPage/` holds `LoginPage.tsx`, its test and whatever only the login uses (`signInErrorMessage.ts`). The feature root keeps its barrel, its `api.ts` and, in `components/`, what two of its pages share (`AuthShell`, `PasswordInput`). A route is a folder as well: `routes/login/route.tsx` beside `route.test.tsx`. That is TanStack Router's `route.tsx` token, the same idea as Next.js's `page.tsx` and SvelteKit's `+page.svelte`. The API already groups this way (`apps/api/src/auth/signup/`).

The flat layout mixes three kinds of file in one folder once a feature has two pages: a page, a helper only that page uses, and a component the pages share. And the router splits a route that has children in two anyway: `_authenticated.tsx` outside, its children in `_authenticated/`. A folder per route puts a route and its children in the same place, and it matches the page folders.

## Consequences

- **A file climbs one level only when a second consumer needs it**: from a page folder to `features/<x>/components/` when a second page does, from there to `components/` when a second feature does.
- **Many editor tabs read `route.tsx`.** Search by folder (`login/route`). The page file is named after its export (`LoginPage/LoginPage.tsx`), so pages don't add to it.
- **`index.tsx` in `routes/` means an index route**, never "the file of this folder". `login/index.tsx` would be the route `/login/`, with a different route id.
- Route ids are unchanged by the move (`/login`, `/_authenticated`), so no `createFileRoute` or `Link` changes. Only `routeTree.gen.ts`'s import paths and identifiers change.

## Considered Options

- **Flat routes** (`login.tsx` + `login.test.tsx`): TanStack's default, and a route file is thin, so a folder per route adds nesting for two files. Rejected, because routes with children end up half in a folder anyway.
- **UI inside `routes/` with TanStack's `-components/` prefix**: puts a route's UI beside it with no `features/`. Rejected: it competes with `features/` and breaks the thin-route rule.
- **`LoginPage/index.tsx`**: a shorter import, but every page's tab and stack frame would read `index.tsx`, and it breaks "a component file is named after its export". Routes import from the feature barrel, so no per-page `index.ts` is needed.
