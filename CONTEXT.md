# BluPrint

Construction-site management: engineers record site issues as pins over floor plans, grouped by unit and by discipline, and export reports for the people who execute the work. Each term below is the canonical English name used in code, issues and docs, followed by the pt-BR word used in `docs/requisitos.md` and in the interface.

## Language

### Accounts and roles

**Organization** (pt-BR: *organização*, *construtora*):
The construction company that buys licenses. Ex.: Melnick.
_Avoid_: company, builder, tenant

**License** (pt-BR: *licença*):
The right to create one project, owned by the organization and never by a person.

**Project** (pt-BR: *obra*, *projeto*):
One construction development, enabled by one license. Ex.: Casa Moinhos.
_Avoid_: site, work, construction

**Organization membership** (pt-BR: *vínculo com a organização*; table `member`):
A person's link to an organization; holds their default role.
_Avoid_: vínculo

**Project membership** (pt-BR: *vínculo com a obra*; table `project_member`):
A person's link to a project; holds their effective role.
_Avoid_: vínculo, assignment

**Default role** (pt-BR: *papel padrão*):
The role on the organization membership. It only suggests a role in the interface and never authorizes anything.

**Effective role** (pt-BR: *papel efetivo*):
The role on a project membership, and the only role that authorizes. Either `manager` or `assistant`.

**Platform admin** (pt-BR: *super admin*; column `is_platform_admin`):
BluPrint staff. Sees organization and license metadata only, never project content, and is a member of no organization.
_Avoid_: super admin, superuser

**Admin** (pt-BR: *admin da construtora*, *gerente geral*):
The top role of an organization. Sees every project in it, read-and-export only on operational content.
_Avoid_: general manager, owner

**Manager** (pt-BR: *gerente de obra*):
The engineer responsible for a project; sees only the projects they are a member of.
_Avoid_: project manager, engineer

**Assistant** (pt-BR: *assistente de obra*):
An engineering assistant who records pins in the field; sees only the projects they are a member of.

**Worker** (pt-BR: *obreiro*):
The person who executes the work. Has no account and receives the report only.
_Avoid_: crew member, laborer

**Contractor** (pt-BR: *empresa executora*, *empreiteira*):
The company that executes a discipline's work on a unit. Ex.: Hellers, Wack.
_Avoid_: vendor, subcontractor

### Site structure

**Location** (pt-BR: *local*):
Any node of a project's physical tree: a tower, a floor, a unit or a common area.
_Avoid_: space, place

**Unit** (pt-BR: *unidade*):
An apartment or office; always hangs on a floor. Has a status and a sale status.
_Avoid_: apartment

**Common area** (pt-BR: *área comum*):
A shared location with no unit number or status, such as a hall, garage, party room or façade.

**Room** (pt-BR: *cômodo*):
A room inside a unit or common area, used as the place of a pin. Not a location.

### Plans and pins

**Discipline** (pt-BR: *disciplina*):
A trade whose issues are tracked separately, such as plumbing or electrical. Defined for the whole project.

**General** (pt-BR: *Geral*):
The discipline whose plan accepts pins of every discipline. No pin is ever recorded as General.
_Avoid_: architectural, arquitetônica

**Plan** (pt-BR: *planta*):
A floor-plan image uploaded for one location and one discipline.
_Avoid_: blueprint, drawing, floor plan

**Pin** (pt-BR: *pin*, *pendência*):
One site issue, placed at a point on a plan, with its discipline, room, contractor and photos.
_Avoid_: issue, marker, pendency

**Report** (pt-BR: *relatório*):
A PDF of pins for a scope, generated on demand and handed to workers.
