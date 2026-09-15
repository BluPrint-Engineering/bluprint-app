import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

// raw SQL: Drizzle has no uuid v7 builder; needs Postgres 18, and a lower version fails at db:migrate, not db:generate
export const uuidV7PrimaryKey = () =>
	uuid()
		.primaryKey()
		.default(sql`uuidv7()`);

export const createdAt = () =>
	timestamp({ withTimezone: true }).defaultNow().notNull();
