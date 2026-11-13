import {
	boolean,
	foreignKey,
	pgTable,
	primaryKey,
	uuid,
} from "drizzle-orm/pg-core";
import { location } from "../structure/location.entity";
import { discipline } from "./discipline.entity";

export const locationDiscipline = pgTable(
	"location_discipline",
	{
		locationId: uuid().notNull(),
		disciplineId: uuid().notNull(),
		projectId: uuid().notNull(),
		applies: boolean().notNull(),
	},
	(table) => [
		primaryKey({
			name: "location_discipline_pk",
			columns: [table.locationId, table.disciplineId],
		}),
		foreignKey({
			name: "location_discipline_location_fk",
			columns: [table.locationId, table.projectId],
			foreignColumns: [location.id, location.projectId],
		}).onDelete("cascade"),
		foreignKey({
			name: "location_discipline_discipline_fk",
			columns: [table.disciplineId, table.projectId],
			foreignColumns: [discipline.id, discipline.projectId],
		}).onDelete("cascade"),
	],
);
