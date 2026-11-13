import { disciplineTypes } from "@bluprint/shared";
import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	pgEnum,
	pgTable,
	text,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { project } from "../projects/project.entity";

export const disciplineType = pgEnum("discipline_type", disciplineTypes);

export const comparableNameSql = (name: unknown) =>
	sql`lower(regexp_replace(btrim(immutable_unaccent(${name})), '\\s+', ' ', 'g'))`;

export const discipline = pgTable(
	"discipline",
	{
		id: uuidV7PrimaryKey(),
		projectId: uuid()
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		name: text().notNull(),
		color: text(),
		type: disciplineType().notNull(),
		hasOwnPlan: boolean().notNull(),
		appliesEverywhere: boolean().notNull(),
		createdAt: createdAt(),
	},
	(table) => [
		unique("discipline_id_project_id_unique").on(table.id, table.projectId),
		unique("discipline_project_id_color_unique").on(
			table.projectId,
			table.color,
		),
		uniqueIndex("discipline_name_unique").on(
			table.projectId,
			comparableNameSql(table.name),
		),
		uniqueIndex("discipline_general_unique")
			.on(table.projectId)
			.where(sql`${table.type} = 'general'`),
		check(
			"discipline_name_length",
			sql`char_length(btrim(${table.name})) between 1 and 60`,
		),
		check(
			"discipline_color_format",
			sql`${table.color} is null or ${table.color} ~ '^#[0-9A-F]{6}$'`,
		),
		check(
			"discipline_color_only_when_not_general",
			sql`(${table.color} is null) = (${table.type} = 'general')`,
		),
	],
);
