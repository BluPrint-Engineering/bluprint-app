import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { organization } from "../organizations/organization.entity";

export const license = pgTable(
	"license",
	{
		id: uuidV7PrimaryKey(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		units: integer().notNull(),
		createdAt: createdAt(),
	},
	(table) => [
		index("license_organization_id_idx").on(table.organizationId),
		check("license_units_positive", sql`${table.units} > 0`),
	],
);
