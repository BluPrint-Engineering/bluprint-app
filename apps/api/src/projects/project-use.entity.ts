import {
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/auth.entity";
import { project } from "./project.entity";

export const projectUse = pgTable(
	"project_use",
	{
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		projectId: uuid()
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		lastUsedAt: timestamp({ withTimezone: true }).notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.userId, table.projectId],
		}),
	],
);
