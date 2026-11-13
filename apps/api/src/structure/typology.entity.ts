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

export const typology = pgTable(
	"typology",
	{
		id: uuidV7PrimaryKey(),
		projectId: uuid()
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		name: text().notNull(),
		createdAt: createdAt(),
	},
	(table) => [
		unique("typology_id_project_id_unique").on(table.id, table.projectId),
		uniqueIndex("typology_name_unique").on(
			table.projectId,
			nameIgnoringCaseAndSpacing(table.name),
		),
		check(
			"typology_name_length",
			sql`char_length(btrim(${table.name})) between 1 and 60`,
		),
	],
);

export const typologyRoom = pgTable(
	"typology_room",
	{
		id: uuidV7PrimaryKey(),
		typologyId: uuid()
			.notNull()
			.references(() => typology.id, { onDelete: "cascade" }),
		name: text().notNull(),
		position: integer().notNull(),
	},
	(table) => [
		index("typology_room_typology_id_idx").on(table.typologyId),
		uniqueIndex("typology_room_name_unique").on(
			table.typologyId,
			nameIgnoringCaseAndSpacing(table.name),
		),
		check(
			"typology_room_name_length",
			sql`char_length(btrim(${table.name})) between 1 and 60`,
		),
		check("typology_room_position_non_negative", sql`${table.position} >= 0`),
	],
);
