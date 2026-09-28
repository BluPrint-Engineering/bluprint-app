import { projectStatuses } from "@bluprint/shared";
import {
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
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
		// a delivered project is frozen until reopened (ADR 0056)
		status: projectStatus().notNull().default("active"),
		createdAt: createdAt(),
		// every write route on operational content sets it; renaming or changing status does not
		lastActivityAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("project_organization_id_idx").on(table.organizationId)],
);
