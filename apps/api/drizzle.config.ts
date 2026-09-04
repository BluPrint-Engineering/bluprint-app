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
	schema: "./src/db/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl,
	},
});
