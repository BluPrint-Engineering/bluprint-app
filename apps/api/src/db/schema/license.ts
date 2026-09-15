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
		// null = free; the unique index below is the real guard behind #40's SKIP LOCKED, not redundant — see docs/data-model.md
		projectId: uuid().references(() => project.id),
		createdAt: createdAt(),
	},
	(table) => [
		index("license_organization_id_idx").on(table.organizationId),
		uniqueIndex("license_project_id_uidx").on(table.projectId),
	],
);
