import { pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, uuidV7PrimaryKey } from "./columns";

export const organization = pgTable("organization", {
	id: uuidV7PrimaryKey(),
	name: text().notNull(),
	createdAt: createdAt(),
});
