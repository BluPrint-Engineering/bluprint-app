import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs in its own process, outside the Nest ConfigModule.
config({ path: ["../../.env.local", "../../.env"] });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set — copy .env.example to .env first.");
}

export default defineConfig({
	dialect: "postgresql",
	// must match createDatabase in db/database.module.ts, or migration and query disagree on column names
	casing: "snake_case",
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl,
	},
});
