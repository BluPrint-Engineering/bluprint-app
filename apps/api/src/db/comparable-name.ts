import { sql } from "drizzle-orm";

export const comparableNameSql = (name: unknown) =>
	sql`lower(regexp_replace(btrim(immutable_unaccent(${name})), '\\s+', ' ', 'g'))`;
