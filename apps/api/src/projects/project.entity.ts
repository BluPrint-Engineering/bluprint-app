import { projectStatuses } from "@bluprint/shared";
import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/auth.entity";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { organization } from "../organizations/organization.entity";

export const projectStatus = pgEnum("project_status", projectStatuses);

export const project = pgTable(
	"project",
	{
		id: uuidV7PrimaryKey(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		name: text().notNull(),
		status: projectStatus().notNull().default("active"),
		reservedUnits: integer().notNull().default(0),
		deliveredBy: text().references(() => user.id, { onDelete: "set null" }),
		deliveredAt: timestamp({ withTimezone: true }),
		createdAt: createdAt(),
		// starts at creation; a write to operational content must bump it, a rename or status change must not
		lastActivityAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("project_organization_id_idx").on(table.organizationId),
		check(
			"project_reserved_units_non_negative",
			sql`${table.reservedUnits} >= 0`,
		),
		check(
			"project_delivery_only_when_delivered",
			sql`${table.status} = 'delivered' or (${table.deliveredBy} is null and ${table.deliveredAt} is null)`,
		),
	],
);
