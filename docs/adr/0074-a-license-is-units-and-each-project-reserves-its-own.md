# A license is a number of units, each project reserves its own, and a unit that held content is spent for good

Supersedes [0019](0019-license-belongs-to-the-organization.md) ("one per project"). Replaces the license reasoning in [0067](0067-admin-configures-any-project-through-the-organization.md), [0068](0068-client-names-the-new-project-id.md) and [0069](0069-delivering-a-project-is-final.md); their decisions stand.

A license is a purchase of a number of units by the organization, never by a person. The organization's contracted units are the sum of its licenses. Every project holds a reservation of units, set by the admin when the project is created and changed only by the admin; the organization's free units are the contracted units minus all reservations. A project creates units only within its own reservation: every unit created uses one, a unit removed without ever holding content returns its place to the project's reservation, and a unit that ever held content stays used even when it is archived, deleted for good or emptied pin by pin. Content on a floor or a common area marks the units that exist below it at that moment. A reservation never drops below the units its project uses. When a project is delivered, its reservation becomes the units it used and the rest returns to the free units.

A license per project could not be protected: a project never delivered can hold a second building as one more tower, or be emptied of its work and renamed, and delivery is voluntary. Units are what the organization sells and knows before its own first sale, so metering them closes both paths without any rule on renaming or removing. A reservation per project, instead of a shared balance, keeps one project from consuming what another was counting on and tells the admin, at a glance, how many units are left to start a new project.

Requirements: RF-103, RF-104, RF-107, RF-111, RF-112, RF-118, RF-201, RF-217, RF-218, RF-219

## Consequences

- **Only units count.** Towers, floors, common areas and rooms are free. A project with no units spends nothing; that residue is accepted, and a real project without units would enter through a new RF.
- **Creating a project needs free units.** The new project page asks for the reservation with the name; with no free units the admin cannot start a project, and the refusal is `409 NO_UNITS_LEFT` problem details ([0047](0047-errors-are-rfc-9457-problem-details.md)) with how many were asked and how many are available. The client-generated id of 0068 stays: it still keeps a retry from creating a second project.
- **Spent is sticky.** A unit is marked when content first reaches it or a location above it ([0073](0073-one-remove-action-decided-by-content.md)); removing a marked unit never returns its place.
- **All or nothing at the limit.** Every path that creates units (wizard, add unit, add floors, undo, duplicate) checks the project's remaining units in the transaction that inserts, under the project lock the structure writes already take, and refuses the whole request with `409 NO_UNITS_LEFT`. Changing reservations locks the organization; changing one project's reservation locks the project first, then the organization.
- **Who sees what.** The admin sees the free units on the project list and every reservation on the Unidades screen; managers and assistants see how many remain in their project where they create units, and read the project's reservation.
- **A project is still never deleted.** The license no longer motivates it; the record does. Lowering an unused project's reservation to its used units returns everything else.
- **Delivery stays final** (0069) to keep what was handed over unchanged; it also releases the unused reservation.
- **The platform admin registers each license with its unit count** and sees contracted, reserved and used units per organization, all metadata ([0021](0021-platform-admin-sees-only-metadata.md)).

## Considered Options

- **One license per project** (0019): leaves a second building as one more tower, and emptying plus renaming after the work.
- **Rules on renaming or removing**: none of them stops one more tower.
- **A shared organization balance with an optional ceiling per project**: the first project to create units takes them from all the others, and the admin cannot tell how many units a new project could count on.
- **An optional reservation**: two pools again, and the race returns for projects without one.
- **A minimum of units per project, or a size per license**: harder to sell, and a growing project would need its own license enlarged.
- **A validity period**: freezes a late project mid-work and still lets one project hold two buildings.
- **Signals in the platform panel and contract terms only**: detects, does not close.
