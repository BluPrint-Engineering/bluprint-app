import { defaultRoles } from "@bluprint/shared";
import {
	index,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/auth.entity";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { organization } from "../organizations/organization.entity";

export const memberRole = pgEnum("member_role", defaultRoles);

export const member = pgTable(
	"member",
	{
		id: uuidV7PrimaryKey(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: memberRole().notNull(),
		createdAt: createdAt(),
	},
	(table) => [
		uniqueIndex("member_organization_id_user_id_uidx").on(
			table.organizationId,
			table.userId,
		),
		index("member_user_id_idx").on(table.userId),
	],
);
