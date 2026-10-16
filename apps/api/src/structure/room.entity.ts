import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "../db/columns";
import { location } from "./location.entity";
import { unitTypeRoom } from "./unit-type.entity";

export const room = pgTable(
	"room",
	{
		id: uuidV7PrimaryKey(),
		locationId: uuid()
			.notNull()
			.references(() => location.id, { onDelete: "cascade" }),
		name: text().notNull(),
		position: integer().notNull(),
		unitTypeRoomId: uuid().references(() => unitTypeRoom.id, {
			onDelete: "set null",
		}),
		renamed: boolean().notNull().default(false),
		createdAt: createdAt(),
	},
	(table) => [
		index("room_location_id_idx").on(table.locationId),
		uniqueIndex("room_name_unique").on(
			table.locationId,
			sql`lower(regexp_replace(btrim(${table.name}), '\\s+', ' ', 'g'))`,
		),
		check(
			"room_name_length",
			sql`char_length(btrim(${table.name})) between 1 and 60`,
		),
		check("room_position_non_negative", sql`${table.position} >= 0`),
	],
);

export const droppedRoom = pgTable(
	"dropped_room",
	{
		locationId: uuid()
			.notNull()
			.references(() => location.id, { onDelete: "cascade" }),
		unitTypeRoomId: uuid()
			.notNull()
			.references(() => unitTypeRoom.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({
			name: "dropped_room_pk",
			columns: [table.locationId, table.unitTypeRoomId],
		}),
	],
);
