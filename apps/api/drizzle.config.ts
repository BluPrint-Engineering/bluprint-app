import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs in its own process, outside the Nest ConfigModule.
config({ path: "../../.env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set — copy .env.example to .env first.");
}

export default defineConfig({
	dialect: "postgresql",
	// Must match `createDatabase` in db/database.module.ts. Out of sync, the
	// migration and the query disagree on the column name — and it still builds.
	casing: "snake_case",
	schema: "./src/db/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl,
	},
});
