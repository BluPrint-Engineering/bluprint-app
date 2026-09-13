import { effectiveRoles } from "@bluprint/shared";
import {
	index,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, uuidV7PrimaryKey } from "./columns";
import { project } from "./project";

export const projectMemberRole = pgEnum("project_member_role", effectiveRoles);

export const projectMember = pgTable(
	"project_member",
	{
		id: uuidV7PrimaryKey(),
		projectId: uuid()
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		// text, not uuid: Better Auth owns user.id.
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: projectMemberRole().notNull(),
		createdAt: createdAt(),
	},
	(table) => [
		uniqueIndex("project_member_project_id_user_id_uidx").on(
			table.projectId,
			table.userId,
		),
		index("project_member_user_id_idx").on(table.userId),
	],
);
