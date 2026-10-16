import { locationTypes } from "@bluprint/shared";
import { sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { project } from "../projects/project.entity";
import { unitType } from "./unit-type.entity";

export const locationType = pgEnum("location_type", locationTypes);

export const location = pgTable(
	"location",
	{
		id: uuidV7PrimaryKey(),
		projectId: uuid()
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		parentId: uuid(),
		type: locationType().notNull(),
		unitTypeId: uuid(),
		name: text().notNull(),
		position: integer().notNull(),
		createdAt: createdAt(),
	},
	(table) => {
		const sameNameIgnoringCaseAndSpacing = sql`lower(regexp_replace(btrim(${table.name}), '\\s+', ' ', 'g'))`;

		return [
			unique("location_id_project_id_unique").on(table.id, table.projectId),
			foreignKey({
				name: "location_parent_fk",
				columns: [table.parentId, table.projectId],
				foreignColumns: [table.id, table.projectId],
			}).onDelete("cascade"),
			foreignKey({
				name: "location_unit_type_fk",
				columns: [table.unitTypeId, table.projectId],
				foreignColumns: [unitType.id, unitType.projectId],
			}),
			index("location_project_id_idx").on(table.projectId),
			index("location_parent_id_idx").on(table.parentId),
			uniqueIndex("location_root_name_unique")
				.on(table.projectId, table.type, sameNameIgnoringCaseAndSpacing)
				.where(sql`${table.parentId} is null`),
			uniqueIndex("location_child_name_unique")
				.on(table.parentId, table.type, sameNameIgnoringCaseAndSpacing)
				.where(sql`${table.parentId} is not null`),
			check(
				"location_name_length",
				sql`char_length(btrim(${table.name})) between 1 and 60`,
			),
			check(
				"location_unit_type_on_unit",
				sql`${table.unitTypeId} is null or ${table.type} = 'unit'`,
			),
			check("location_position_non_negative", sql`${table.position} >= 0`),
			check(
				"location_root_type",
				sql`${table.parentId} is not null or ${table.type} in ('tower', 'common_area')`,
			),
		];
	},
);
