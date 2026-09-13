import { index, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "./columns";
import { organization } from "./organization";
import { project } from "./project";

export const license = pgTable(
	"license",
	{
		id: uuidV7PrimaryKey(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Nullable: null is a free license, filled is a consumed one. The unique
		// index is what actually stops two licenses from attaching to the same
		// project — a `SELECT ... FOR UPDATE SKIP LOCKED` dequeue only prevents a
		// race between two callers reading the same free row; it does nothing if
		// the writing logic has a bug and reuses a project id. Not redundant with
		// that locking query — don't drop it.
		projectId: uuid().references(() => project.id),
		createdAt: createdAt(),
	},
	(table) => [
		index("license_organization_id_idx").on(table.organizationId),
		uniqueIndex("license_project_id_uidx").on(table.projectId),
	],
);
