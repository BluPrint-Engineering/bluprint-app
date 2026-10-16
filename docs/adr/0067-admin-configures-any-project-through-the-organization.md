# The admin configures any project through the organization membership

Supersedes [0025](0025-project-structure-editable-by-all-members.md). Its consequence that a delivered project still accepts rename and reopen is superseded by [0069](0069-delivering-a-project-is-final.md); the rest stands. Its license reasoning (a rename never frees the license) is replaced by [0074](0074-a-license-is-units-and-each-project-reserves-its-own.md).

A project's configuration (name, status, structure, project memberships, disciplines, contractors) is edited by everyone on the project and by the organization's admin, who reaches every project through the organization membership and never holds a project membership ([0024](0024-admin-is-read-and-export-only.md)). The admin creates the project and lands on it to set it up, so a project does not sit idle until a manager is invited; a manager or an assistant invited later edits the same configuration. 0025 said "every person with a membership, admin included", which never applied to the admin.

Requirements: RF-112, RF-205, RF-217, RF-402

## Consequences

- **The admin's line is drawn at the work, not at the project.** The admin configures, and stays read-and-export only on pins, photos and pin or unit status (0024); `admin` is still absent from the effective roles, so every configuration route authorizes the effective role on the project membership or the admin's organization membership.
- **Destruction follows content, not role.** An empty item is deleted by anyone who may configure; an item with content is archived, and only a manager or the admin restores it or deletes it for good ([0036](0036-empty-structure-deletes-work-archives.md), RF-209 to RF-214). A rename never frees the license: a project is never deleted, so its license cannot move to another project.
- **Each role keeps its own limits inside the configuration.** Marking delivered and reopening stay with a manager or the admin ([0056](0056-delivered-project-is-frozen-until-reopened.md)); a delivered project refuses every configuration write except the name and the status, so rename and reopen stay allowed (0056, RF-217).

## Considered Options

- **The admin only reads; managers configure**: matches "read-and-export only" literally, but a freshly created project has no manager until the invitations of epic #11 exist, so it would sit blank with nobody allowed to set it up.
- **The admin edits the structure only**: follows RF-205 to the letter and leaves team, disciplines and contractors to each epic, which splits one setup flow across rules a user cannot see.
