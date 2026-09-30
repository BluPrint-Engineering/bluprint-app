import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { applyMigrations, migrationsFolder } from "./migrator";

const scratchDatabase = `bluprint_migrator_${randomUUID().replaceAll("-", "").slice(0, 12)}`;

function urlFor(database: string): string {
	const url = new URL(process.env.DATABASE_URL!);
	url.pathname = `/${database}`;
	return url.toString();
}

async function withClient<T>(
	database: string,
	run: (client: Client) => Promise<T>,
): Promise<T> {
	const client = new Client({ connectionString: urlFor(database) });
	await client.connect();
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}

const journalEntries = (
	JSON.parse(
		readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
	) as { entries: unknown[] }
).entries.length;

beforeAll(async () => {
	await withClient("postgres", (client) =>
		client.query(`CREATE DATABASE "${scratchDatabase}"`),
	);
});

afterAll(async () => {
	await withClient("postgres", (client) =>
		client.query(`DROP DATABASE IF EXISTS "${scratchDatabase}" WITH (FORCE)`),
	);
});

describe("applyMigrations", () => {
	test("applies every migration to an empty database", async () => {
		await applyMigrations(urlFor(scratchDatabase));

		await withClient(scratchDatabase, async (client) => {
			const applied = await client.query<{ n: number }>(
				"SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
			);
			expect(applied.rows[0]?.n).toBe(journalEntries);

			const tables = await client.query(
				"SELECT to_regclass('public.project') AS project, to_regclass('public.project_member') AS project_member",
			);
			expect(tables.rows[0]).toEqual({
				project: "project",
				project_member: "project_member",
			});
		});
	});

	test("is a no-op when everything is already applied", async () => {
		await applyMigrations(urlFor(scratchDatabase));

		await withClient(scratchDatabase, async (client) => {
			const applied = await client.query<{ n: number }>(
				"SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
			);
			expect(applied.rows[0]?.n).toBe(journalEntries);
		});
	});
});
