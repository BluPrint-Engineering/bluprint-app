Closes #

## What changes

<!-- Two or three lines: what this PR does, and why. -->

## General

- [ ] If a product rule, a technical decision or the architecture changed, the doc changed in the same PR (`docs/requisitos.md`, a new ADR in `docs/adr/`, or `docs/ARCHITECTURE.md`) — or `n/a`

## Web

<!-- No interface change? Write n/a on this line and leave the boxes as they are. -->

- [ ] **Mobile** screenshot (field use is on a phone, one-handed)
- [ ] **Desktop** screenshot
- [ ] GIF of the flow, if the PR changes an interaction
- [ ] Interface text in pt-BR
- [ ] Large touch targets, reachable with one hand
- [ ] Status and discipline never conveyed by color alone: a label, icon or legend alongside
- [ ] Colors legible over a light floor plan, in direct sun

## API

<!-- No API change? Write n/a on this line and leave the boxes as they are. -->

- [ ] New route is documented in OpenAPI (`@ApiTags`, `@ApiOperation`, `@ZodResponse`, `@ApiErrorResponses`) — checked at `/api/docs`
- [ ] A failure the client acts on throws `ProblemException` with a stable `code`, and the web maps that `code` to pt-BR
- [ ] New route follows the contract: schema in `packages/shared`, `nestjs-zod` DTO in the API, parsed in the web app's `apiFetch` (`/health` is the complete example)
- [ ] The action records author, project and time
