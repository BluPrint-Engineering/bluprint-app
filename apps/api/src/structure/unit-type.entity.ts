import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { project } from "../projects/project.entity";

const nameIgnoringCaseAndSpacing = (name: unknown) =>
	sql`lower(regexp_replace(btrim(${name}), '\\s+', ' ', 'g'))`;

export const unitType = pgTable(
	"unit_type",
	{
		id: uuidV7PrimaryKey(),
		projectId: uuid()
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		name: text().notNull(),
		createdAt: createdAt(),
	},
	(table) => [
		unique("unit_type_id_project_id_unique").on(table.id, table.projectId),
		uniqueIndex("unit_type_name_unique").on(
			table.projectId,
			nameIgnoringCaseAndSpacing(table.name),
		),
		check(
			"unit_type_name_length",
			sql`char_length(btrim(${table.name})) between 1 and 60`,
		),
	],
);

export const unitTypeRoom = pgTable(
	"unit_type_room",
	{
		id: uuidV7PrimaryKey(),
		unitTypeId: uuid()
			.notNull()
			.references(() => unitType.id, { onDelete: "cascade" }),
		name: text().notNull(),
		position: integer().notNull(),
	},
	(table) => [
		index("unit_type_room_unit_type_id_idx").on(table.unitTypeId),
		uniqueIndex("unit_type_room_name_unique").on(
			table.unitTypeId,
			nameIgnoringCaseAndSpacing(table.name),
		),
		check(
			"unit_type_room_name_length",
			sql`char_length(btrim(${table.name})) between 1 and 60`,
		),
		check("unit_type_room_position_non_negative", sql`${table.position} >= 0`),
	],
);
