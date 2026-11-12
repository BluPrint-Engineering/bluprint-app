# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Repo label conventions

The five triage roles in `docs/agents/triage-labels.md` are the `triagem:` axis: they say where an issue sits in the pipeline, nothing about what it is. This repo classifies every issue on three further axes, and no skill applies them for you — apply them yourself whenever you create an issue.

- **`tipo:`** — exactly one of `tipo:feat`, `tipo:bug`, `tipo:chore`, `tipo:docs`, `tipo:infra`.
- **`area:`** — one or more of `area:web`, `area:api`, `area:banco`, `area:storage`, `area:ci`, `area:deploy`, `area:shared`. Pick every workspace the ticket actually touches; a vertical slice usually carries several.
- **`prio:`** — exactly one of `prio:must`, `prio:should`, `prio:could` (MoSCoW, as used in `docs/requisitos.md`). When breaking an epic down, inherit the epic's priority unless the ticket is plainly less critical than the epic as a whole.
- **`epic`** — only on epics themselves. Never on the tickets broken out of one.

Run `gh label list` before assuming a label exists, and don't invent new ones without asking.

## Milestones, epics, tickets and spikes

Four kinds of work, each with one GitHub mechanism. Nothing else gets its own category: a loose idea is a spike (a question to answer) or a ticket in `triagem:pendente`.

| Kind | Answers | Ends when | GitHub |
| --- | --- | --- | --- |
| **Milestone** | "Can the app do X end to end?" | its epics close | a milestone, no due date |
| **Epic** | "Which body of product work has a start and an end?" | its "Pronto quando" closes | issue type `Epic` and the `epic` label |
| **Ticket** | "Which slice ships in one PR?" | the PR merges | native sub-issue of an epic |
| **Spike** | "Which question must be answered before deciding?" | a recommendation or tickets come out | issue type `Spike` and the `tipo:spike` label, no epic, no milestone |

- **Issue type.** Set it on every new issue: `tipo:feat` is `Feature`, `tipo:bug` is `Bug`, `tipo:chore`, `tipo:docs` and `tipo:infra` are `Task`. The `tipo:` labels stay. Set it with `gh issue edit <n> --type <Type>`.
- **Milestone.** An epic gets one; a ticket inherits its parent's (`gh issue edit <n> --milestone "<title>"`). The stages, in order, are `M1 - Obra montada`, `M2 - Primeiro pin`, `M3 - Time entra`, `M4 - Obra acompanhada` and `M5 - Operação BluPrint`. A new stage needs the maintainer's say-so.
- **Epics have an end.** New scope that is not in an epic's "Pronto quando" is a new epic or a spike, never another ticket under the old one; an epic that keeps growing never finishes and turns into a reference. Reference-only parents (screen specs, merged epics) are closed once nothing is left to build; their artifacts stay readable.
- **Only `tipo:feat` needs an epic.** Maintenance (`tipo:infra`, `tipo:chore`, `tipo:docs`, `tipo:bug`) may stand alone, without a milestone.
- **Merging is closing with a pointer.** Copy what matters into the surviving issue, then `gh issue close <n> --reason "not planned" --comment "<pointer>"`. Never delete an issue.

## GitHub Project

The repo has a project board, **BluPrint** (project number `3`, owner `BluPrint-Engineering`). Issues do **not** join it automatically. After creating one:

```
gh project item-add 3 --owner BluPrint-Engineering --url <issue-url>
```

When a skill creates several issues at once (`/to-tickets` breaking down an epic), add each of them, and give each the epic's milestone and the issue type above.

Views: **Roadmap por marco** (open items with a milestone, grouped by milestone, showing sub-issue progress), **Em andamento** (To Do, In Progress, In Review), **Pesquisa e manutenção** (spikes and standalone tasks and bugs) and **Todos os itens**. Status stays Backlog, To Do, In Progress, In Review, Done; the milestone, not the status, says where the app stands.

## Screen specs and implementation slices

A screen's complete visual spec (`README.md`), handoff and prototypes live in [bluprint-prototypes](https://github.com/BluPrint-Engineering/bluprint-prototypes), one immutable folder per version; the screen's parent issue and each ticket carry a link artifact to the file they need, pinned to its commit (ADR 0076, 0088). Screens published earlier hold their spec as artifacts on the parent issue. An issue holds at most 10 artifacts, because the issue page hid its Artifacts section at 24. Reuse the original screen issue when it fits; otherwise create `Tela: <name>`, label it normally and add it to project 3. The screen parent is the epic: type `Epic`, the `epic` label, the stage's milestone and its slices as sub-issues, so it closes when they do. When a numbered area epic (such as `2 — Estrutura da obra`) is still open, the screen epics hang under it as sub-issues. Implementation tickets are native sub-issues; each ticket has its own artifacts containing **only the part it implements**, including the relevant states. A link to the complete parent is context, not a substitute for the slice. Preserve existing historical ticket relationships when migrating shipped screens.

Read the ticket's artifacts first, then the parent for context. Plain `gh` >= 2.103 supports issue artifacts; these are separate from Actions artifacts. Use explicit repository selection outside a clone:

```bash
gh issue artifact list <issue> -R BluPrint-Engineering/bluprint-app
gh issue artifact view <issue> <artifact> -R BluPrint-Engineering/bluprint-app --json body --jq .body
gh issue artifact download <issue> -R BluPrint-Engineering/bluprint-app --dir /tmp/screen
```

A link artifact points at a prototype page at its commit, such as `https://github.com/BluPrint-Engineering/bluprint-prototypes/blob/<sha>/nova-obra/v1/tickets/1.31.html`. Fetch it with `gh api repos/BluPrint-Engineering/bluprint-prototypes/contents/<path>?ref=<sha> -H "Accept: application/vnd.github.raw" > page.html`, or clone the repository, and open it in a browser: each page is standalone, including its sibling screens and Geist fonts, and runs offline. A ticket page holds only that ticket's states, in mobile and desktop, light and dark, with an index; `qa.html` holds every state and `source/` the files as the refinement session left them. [Pages](https://bluprint-engineering.github.io/bluprint-prototypes/) browses the same files. Screens published before ADR 0088 still carry `*.dc.html` and `*-static.html` artifacts.

When implementing, cite the link artifact and the prototype file at its commit in the PR body. Spec artifacts are versioned: `gh issue artifact view <issue> <artifact> --json versions` lists history; `view` and `download` accept `--version <n>`, so cite those by URL and version. Publish through `.claude/skills/bluprint-design/SKILL.md`; a prototype change is a new version folder, never an edit. Keep product requirements and decisions in their repository docs and review changes in the implementation PR. An artifact or prototype alone does not change an approved product rule.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
