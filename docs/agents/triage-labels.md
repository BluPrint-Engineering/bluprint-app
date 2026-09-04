# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `triagem:pendente`   | Maintainer needs to evaluate this issue  |
| `needs-info`               | `triagem:info`       | Waiting on reporter for more information |
| `ready-for-agent`          | `triagem:agente`     | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `triagem:humano`     | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Why these names

`triagem:` is a fifth axis alongside the repo's existing `tipo:`, `area:` and `prio:` labels, and is orthogonal to all of them: an issue is `tipo:feat` + `area:web` + `prio:must` *and* sits at one triage state. Never treat a `tipo:`/`area:`/`prio:` label as a triage state.

`wontfix` is deliberately unprefixed: GitHub's default label already carries exactly this meaning and is already in use, so it is reused rather than duplicated.

Two existing labels look adjacent but are **not** triage states — don't substitute them:

- `question` ("Further information is requested") marks *someone asked a question*, not *this issue is blocked awaiting the reporter*. Use `triagem:info` for the latter.
- `help wanted` means *outside contributions welcome*, not `ready-for-human` (*specified, needs a human dev rather than an agent*).
