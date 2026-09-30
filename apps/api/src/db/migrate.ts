import { envSchema } from "../lib/env";
import { applyMigrations } from "./migrator";

async function main(): Promise<void> {
	const databaseUrl = envSchema.shape.DATABASE_URL.parse(
		process.env.DATABASE_URL,
	);
	await applyMigrations(databaseUrl);
	console.log("Migrations applied.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
