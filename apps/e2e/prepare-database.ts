import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { DATABASE_URL_E2E } from "./env";

async function ensureDatabaseExists(): Promise<void> {
	const target = new URL(DATABASE_URL_E2E);
	const databaseName = decodeURIComponent(target.pathname.slice(1));
	if (!databaseName) {
		throw new Error(
			`DATABASE_URL_E2E has no database name: "${DATABASE_URL_E2E}"`,
		);
	}

	const maintenance = new URL(target);
	maintenance.pathname = "/postgres";

	const client = new Client({ connectionString: maintenance.toString() });
	try {
		await client.connect();
		const existing = await client.query(
			"SELECT 1 FROM pg_database WHERE datname = $1",
			[databaseName],
		);
		if (existing.rowCount === 0) {
			await client.query(
				`CREATE DATABASE ${client.escapeIdentifier(databaseName)}`,
			);
		}
	} finally {
		await client.end();
	}
}

function runApiScript(script: "db:migrate" | "db:seed"): void {
	execFileSync("bun", ["run", "--filter", "@bluprint/api", script], {
		stdio: "inherit",
		env: { ...process.env, DATABASE_URL: DATABASE_URL_E2E },
	});
}

// run before `playwright test`, not as globalSetup: webServer starts first and would crash on a missing database
async function main(): Promise<void> {
	await ensureDatabaseExists();
	runApiScript("db:migrate");
	runApiScript("db:seed");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
