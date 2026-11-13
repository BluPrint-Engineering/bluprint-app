import { randomUUID } from "node:crypto";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { createDatabase, type Database } from "../db/database.module";
import { applyMigrations, migrationsFolder } from "../db/migrator";
import { license, location, organization, project } from "../db/schema";

const MIGRATION = "0016_reserve_common_areas";

type Journal = { entries: { tag: string; when: number }[] };

async function withClient<T>(
	database: string,
	run: (client: Client) => Promise<T>,
): Promise<T> {
	const url = new URL(process.env.DATABASE_URL!);
	url.pathname = `/${database}`;
	const client = new Client({ connectionString: url.toString() });
	await client.connect();
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}

async function migrateUpToBefore(databaseUrl: string, tag: string) {
	const journal = JSON.parse(
		readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
	) as Journal;
	const target = journal.entries.find((entry) => entry.tag === tag);
	expect(target).toBeDefined();

	const priorMigrations = mkdtempSync(join(migrationsFolder, ".reserve-test-"));
	try {
		mkdirSync(join(priorMigrations, "meta"));
		const entries = journal.entries.filter(
			(entry) => entry.when < target!.when,
		);
		writeFileSync(
			join(priorMigrations, "meta/_journal.json"),
			JSON.stringify({ ...journal, entries }),
		);
		for (const entry of entries) {
			copyFileSync(
				join(migrationsFolder, `${entry.tag}.sql`),
				join(priorMigrations, `${entry.tag}.sql`),
			);
		}
		const pool = new Pool({ connectionString: databaseUrl });
		try {
			await migrate(drizzle({ client: pool }), {
				migrationsFolder: priorMigrations,
			});
		} finally {
			await pool.end();
		}
	} finally {
		rmSync(priorMigrations, { recursive: true, force: true });
	}
}

async function onDatabaseBeforeMigration(
	run: (db: Database, databaseUrl: string) => Promise<void>,
) {
	const scratch = `bluprint_reserve_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
	const url = new URL(process.env.DATABASE_URL!);
	url.pathname = `/${scratch}`;
	const scratchUrl = url.toString();
	await withClient("postgres", (client) =>
		client.query(`CREATE DATABASE "${scratch}"`),
	);
	try {
		await migrateUpToBefore(scratchUrl, MIGRATION);
		const pool = new Pool({ connectionString: scratchUrl });
		try {
			await run(createDatabase(pool), scratchUrl);
		} finally {
			await pool.end();
		}
	} finally {
		await withClient("postgres", (client) =>
			client.query(`DROP DATABASE IF EXISTS "${scratch}" WITH (FORCE)`),
		);
	}
}

async function organizationWith(db: Database, contractedUnits: number) {
	const [created] = await db
		.insert(organization)
		.values({ name: "Construtora Alfa" })
		.returning({ id: organization.id });
	await db
		.insert(license)
		.values({ organizationId: created!.id, units: contractedUnits });
	return created!.id;
}

async function projectWith(
	db: Database,
	organizationId: string,
	{
		name,
		reserved,
		units,
		halls,
		status = "active",
	}: {
		name: string;
		reserved: number;
		units: number;
		halls: number;
		status?: "active" | "delivered";
	},
) {
	const [created] = await db
		.insert(project)
		.values({ organizationId, name, reservedUnits: reserved, status })
		.returning({ id: project.id });
	const projectId = created!.id;
	const [tower] = await db
		.insert(location)
		.values({ projectId, type: "tower", name: "Torre A", position: 0 })
		.returning({ id: location.id });
	const [floor] = await db
		.insert(location)
		.values({
			projectId,
			parentId: tower!.id,
			type: "floor",
			name: "1º andar",
			position: 0,
		})
		.returning({ id: location.id });
	await db.insert(location).values([
		...Array.from({ length: units }, (_, at) => ({
			projectId,
			parentId: floor!.id,
			type: "unit" as const,
			name: `10${at + 1}`,
			position: at,
		})),
		...Array.from({ length: halls }, (_, at) => ({
			projectId,
			parentId: floor!.id,
			type: "common_area" as const,
			name: `Hall ${at + 1}`,
			position: units + at,
		})),
	]);
	return projectId;
}

async function reservedOf(db: Database, projectId: string) {
	const found = await db.query.project.findFirst({
		where: eq(project.id, projectId),
	});
	return found!.reservedUnits;
}

describe(`migration ${MIGRATION}`, () => {
	test("raises each project in progress to its units and common areas and leaves the delivered alone", async () => {
		await onDatabaseBeforeMigration(async (db, databaseUrl) => {
			const organizationId = await organizationWith(db, 100);
			const fits = await projectWith(db, organizationId, {
				name: "Edifício Aurora",
				reserved: 10,
				units: 8,
				halls: 1,
			});
			const short = await projectWith(db, organizationId, {
				name: "Residencial Jardins",
				reserved: 10,
				units: 8,
				halls: 5,
			});
			const delivered = await projectWith(db, organizationId, {
				name: "Residencial Vila Nova",
				reserved: 8,
				units: 8,
				halls: 3,
				status: "delivered",
			});

			await applyMigrations(databaseUrl);

			expect(await reservedOf(db, fits)).toBe(10);
			expect(await reservedOf(db, short)).toBe(13);
			expect(await reservedOf(db, delivered)).toBe(8);
		});
	}, 60_000);

	test("stops with an error and changes nothing when a raise passes what the organization contracted", async () => {
		await onDatabaseBeforeMigration(async (db, databaseUrl) => {
			const roomy = await organizationWith(db, 100);
			const roomyShort = await projectWith(db, roomy, {
				name: "Torre Ipê",
				reserved: 10,
				units: 8,
				halls: 5,
			});
			const tight = await organizationWith(db, 20);
			const tightShort = await projectWith(db, tight, {
				name: "Residencial Jardins",
				reserved: 10,
				units: 8,
				halls: 5,
			});
			const tightOther = await projectWith(db, tight, {
				name: "Galpão Sul",
				reserved: 10,
				units: 2,
				halls: 0,
			});

			await expect(applyMigrations(databaseUrl)).rejects.toThrow();

			expect(await reservedOf(db, roomyShort)).toBe(10);
			expect(await reservedOf(db, tightShort)).toBe(10);
			expect(await reservedOf(db, tightOther)).toBe(10);
		});
	}, 60_000);
});
