import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { organization } from "../organizations/organization.entity";

export const project = pgTable(
	"project",
	{
		id: uuidV7PrimaryKey(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		name: text().notNull(),
		createdAt: createdAt(),
	},
	(table) => [index("project_organization_id_idx").on(table.organizationId)],
);
