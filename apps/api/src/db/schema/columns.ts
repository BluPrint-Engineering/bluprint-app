import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

// Raw SQL because Drizzle has no uuid v7 builder. Pins Postgres 18, and
// drizzle-kit never connects — a lower version fails at db:migrate, not at
// db:generate.
export const uuidV7PrimaryKey = () =>
	uuid()
		.primaryKey()
		.default(sql`uuidv7()`);

export const createdAt = () =>
	timestamp({ withTimezone: true }).defaultNow().notNull();
