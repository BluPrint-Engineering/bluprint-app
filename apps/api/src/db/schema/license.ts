import { index, pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "./columns";
import { organization } from "./organization";

export const license = pgTable(
	"license",
	{
		id: uuidV7PrimaryKey(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		createdAt: createdAt(),
	},
	(table) => [index("license_organization_id_idx").on(table.organizationId)],
);
