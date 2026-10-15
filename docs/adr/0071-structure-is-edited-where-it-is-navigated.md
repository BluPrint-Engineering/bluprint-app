# The structure is edited where it is navigated, and a tower reads as its façade

A project's structure has no editor of its own. The navigation everyone uses to reach a unit (project, tower, floor, unit, RF-604) carries the editing: each level lists its children with an "add" action at the end and a menu per item for rename, reorder, duplicate and remove. A tower shows every floor as a row holding its units and common areas, so a unit is two taps from the project and a wrong number shows at a glance. Setting up a whole project goes through one wizard that creates every tower at once, each with its own floor range, units per floor, ground floor, halls, common areas and unit types, with a preview before anything is saved. Everyone on the project and the admin edit (ADR 0067), so there is no edit mode to enter.

Requirements: RF-202, RF-203, RF-205, RF-206, RF-207, RF-208, RF-604

## Consequences

- **The project configuration only summarises the structure** and keeps the unit types and the archived locations; the frame #46 drew for it is replaced.
- **A project with a single tower never shows the tower**: the project start shows that tower's façade, and the tower appears, with a name, only once a second one exists.
- **Names are generated, then free.** The wizard numbers units as floor number plus two digits (101 … 1204, optionally with a letter), and any name can then be changed. A unit's or floor's name is unique within its tower and a common area's within its parent, ignoring case and spacing; archived locations do not count. The order of floors and of units is stored, never derived from the name, because Subsolo, Térreo, Mezanino and Cobertura do not sort.
- **The same wizard adds to an existing project** (two more floors on Tower B), so the first setup and a later extension are one flow.
- **Moving a location to another parent is out**: mistakes surface while the structure is still empty, where removing and adding costs a tap; reordering within a parent stays.
- Locations, rooms and unit types get client-generated ids, so the wizard sends one request and a retry creates nothing twice ([0043](0043-client-generated-pin-ids.md), [0068](0068-client-names-the-new-project-id.md)).

## Considered Options

- **A structure section inside the configuration**: one place to configure, but a tree of 500 units inside a card on a phone, and a second drawing of the same building next to the navigation.
- **A separate structure editor page**: room for scale and a clean navigation, but two parallel paths to the same building, and a mistake noticed in unit 901 is fixed somewhere else.
- **A list of floors per tower**: uniform levels, one more tap for every unit, and the building is never visible.
- **One tower at a time, then duplicate it**: a shorter form, but towers that differ become manual edits afterwards.
- **Pasting a spreadsheet of units**: exact for irregular projects, but a format to teach and validate; left for when a customer asks.
