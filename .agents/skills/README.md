# Project skills

Vendored copies, unmodified. Claude Code sees them through per-skill symlinks in `.claude/skills/`. `bluprint-design` and `verify` stay in `.claude/skills/` only.

| Skill | Source | Commit |
| --- | --- | --- |
| `domain-modeling`, `grill-with-docs`, `triage`, `wizard` | https://github.com/mattpocock/skills (`skills/engineering/`) | `a496f5513d4a4cf889bc48e189e579f4b0bdf6aa` |
| `frontend-ui-engineering`, `security-and-hardening`, `api-and-interface-design`, `observability-and-instrumentation`, `code-simplification` | https://github.com/addyosmani/agent-skills (`skills/`) | `eb07f19f52c2669f2364897aaa293e2aaddd7b1c` |

- `.agents/references/` is a copy of Addy's repo-level `references/` (same commit), so the skills' `../../references/*.md` links resolve.
- Matt's skills say `GLOSSARY.md`; this repo's file is `CONTEXT.md`. See `docs/agents/domain.md`.
- `grill-with-docs` and `triage` need the global `grilling` skill; `to-spec` / `to-tickets` are global too and read `docs/agents/`.
