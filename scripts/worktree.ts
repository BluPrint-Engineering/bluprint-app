// docs/adr/0049-per-worktree-isolation.md
import { copyFileSync, existsSync, constants as fsConstants } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";
import {
	cleanStaleReservations,
	databasesFor,
	describeError,
	envLocalContents,
	gitCommonDir,
	isLinkedWorktree,
	listWorktrees,
	mainWorktreePath,
	parseEnvFile,
	pickSlot,
	releaseSlotReservation,
	reservedWorktreePaths,
	reserveSlot,
	resolveDatabaseUrl,
	slugFor,
	urlWithDatabase,
	withSetupLock,
	worktreeRoot,
} from "./worktree-core";

const REPO_ROOT = resolve(import.meta.dirname, "..");

async function loadPg(cwd: string) {
	const entry = Bun.resolveSync("pg", resolve(cwd, "apps/api"));
	return import(entry);
}

async function copyMainEnv(cwd: string): Promise<void> {
	const dst = resolve(cwd, ".env");
	if (existsSync(dst)) return;
	const src = resolve(await mainWorktreePath(cwd), ".env");
	if (!existsSync(src)) {
		console.warn(
			"worktree:setup: main checkout has no .env — copy .env.example by hand.",
		);
		return;
	}
	try {
		copyFileSync(src, dst, fsConstants.COPYFILE_EXCL);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
	}
}

const DUPLICATE_DATABASE = "42P04";

async function ensureDatabases(client, names: string[]): Promise<void> {
	for (const name of names) {
		try {
			await client.query(`CREATE DATABASE ${client.escapeIdentifier(name)}`);
		} catch (error) {
			if ((error as { code?: string }).code !== DUPLICATE_DATABASE) throw error;
		}
	}
}

async function runSetupSteps(
	cwd: string,
	slot: number,
	slug: string,
): Promise<void> {
	// Must run before any pg import: a fresh worktree has neither yet.
	await $`bun install --frozen-lockfile`.cwd(cwd);
	await $`bun run --filter @bluprint/shared build`.cwd(cwd);

	const { Client } = await loadPg(cwd);
	const baseUrl = resolveDatabaseUrl(cwd);
	const { dev, test, e2e } = databasesFor(slug);

	const admin = new Client({
		connectionString: urlWithDatabase(baseUrl, "postgres"),
	});
	await admin.connect();
	try {
		await ensureDatabases(admin, [dev, test, e2e]);
	} finally {
		await admin.end();
	}

	for (const name of [dev, test, e2e]) {
		await $`bun run --filter @bluprint/api db:migrate`
			.cwd(cwd)
			.env({ ...process.env, DATABASE_URL: urlWithDatabase(baseUrl, name) });
	}

	await $`bun run --filter @bluprint/api db:seed`
		.cwd(cwd)
		.env({ ...process.env, DATABASE_URL: urlWithDatabase(baseUrl, dev) });

	// Written last: a failed run leaves nothing, so a retry starts clean.
	await Bun.write(
		resolve(cwd, ".env.local"),
		envLocalContents(slot, slug, baseUrl),
	);

	const apiPort = 3000 + 10 * slot;
	const webPort = 5173 + 10 * slot;
	console.log(
		`worktree:setup: slot ${slot} — api :${apiPort}, web :${webPort}.`,
	);
}

async function setup(rawCwd: string): Promise<void> {
	const cwd = await worktreeRoot(rawCwd);
	if (!(await isLinkedWorktree(cwd))) {
		console.log("worktree:setup: main checkout, nothing to do.");
		return;
	}

	const existing = parseEnvFile(resolve(cwd, ".env.local"));
	if (existing.SLOT && existing.SLUG) {
		console.log(`worktree:setup: already set up (slot ${existing.SLOT}).`);
		return;
	}

	await copyMainEnv(cwd);

	const commonDir = await gitCommonDir(cwd);
	const slug = slugFor(cwd);
	const slot = await withSetupLock(commonDir, async () => {
		cleanStaleReservations(commonDir);
		const picked = await pickSlot(cwd, commonDir);
		reserveSlot(commonDir, picked, cwd);
		return picked;
	});

	try {
		await runSetupSteps(cwd, slot, slug);
	} finally {
		releaseSlotReservation(commonDir, slot);
	}
}

async function prune(rawCwd: string): Promise<void> {
	const cwd = await worktreeRoot(rawCwd);
	const commonDir = await gitCommonDir(cwd);
	cleanStaleReservations(commonDir);

	const live = new Set<string>();
	const addDatabasesFor = (slug: string) => {
		const { dev, test, e2e } = databasesFor(slug);
		live.add(dev).add(test).add(e2e);
	};

	// Reservations first: a setup finishing mid-scan is caught by one read or the other.
	for (const worktreePath of reservedWorktreePaths(commonDir)) {
		addDatabasesFor(slugFor(worktreePath));
	}
	for (const worktree of await listWorktrees(cwd)) {
		const env = parseEnvFile(resolve(worktree.path, ".env.local"));
		if (env.SLUG) addDatabasesFor(env.SLUG);
	}

	const { Client } = await loadPg(cwd);
	const baseUrl = resolveDatabaseUrl(cwd);
	const client = new Client({
		connectionString: urlWithDatabase(baseUrl, "postgres"),
	});
	await client.connect();
	try {
		const { rows } = await client.query(
			"SELECT datname FROM pg_database WHERE datname LIKE 'bluprint\\_wt\\_%' ESCAPE '\\'",
		);
		for (const { datname } of rows as { datname: string }[]) {
			if (live.has(datname)) continue;
			await client.query(
				`DROP DATABASE IF EXISTS ${client.escapeIdentifier(datname)} WITH (FORCE)`,
			);
			console.log(`worktree:prune: dropped ${datname}.`);
		}
	} finally {
		await client.end();
	}
}

async function main(): Promise<void> {
	const command = process.argv[2];
	if (command === "setup") {
		await setup(REPO_ROOT);
	} else if (command === "prune") {
		await prune(REPO_ROOT);
	} else {
		console.error("Usage: bun scripts/worktree.ts <setup|prune>");
		process.exit(1);
	}
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		console.error(`worktree: ${describeError(error)}`);
		process.exit(1);
	}
}
