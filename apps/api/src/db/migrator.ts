import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Resolves to apps/api/drizzle from both src/db and dist/db. */
export const migrationsFolder = join(__dirname, "../../drizzle");

const connectionTimeoutMs = 15_000;

export async function applyMigrations(databaseUrl: string): Promise<void> {
	const pool = new Pool({
		connectionString: databaseUrl,
		connectionTimeoutMillis: connectionTimeoutMs,
	});
	try {
		await migrate(drizzle({ client: pool }), {
			migrationsFolder,
		});
	} finally {
		await pool.end();
	}
}
