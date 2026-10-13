import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { $ } from "bun";
import { slugFor } from "../../../../scripts/worktree-core";

export const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
export const E2E_DIR = resolve(REPO_ROOT, "apps/e2e");

const RUN_ROOT = resolve(tmpdir(), "bluprint-verify", slugFor(REPO_ROOT));
export const INSTANCE_DIR = resolve(RUN_ROOT, "instance");
export const EVIDENCE_ROOT = resolve(RUN_ROOT, "evidence");
const STATE_FILE = resolve(INSTANCE_DIR, "state.json");

export interface InstanceState {
	apiPgid: number;
	webPgid: number;
	apiUrl: string;
	webUrl: string;
	databaseUrl: string;
	head: string;
	treeDigest: string;
	startedAt: string;
}

export interface E2eConfig {
	apiPort: number;
	webPort: number;
	apiUrl: string;
	webUrl: string;
	databaseUrl: string;
}

// apps/e2e/env.ts resolves .env.local/.env against the cwd and copies them into process.env, as `bun run e2e` does.
export async function loadE2eConfig(): Promise<E2eConfig> {
	const previous = process.cwd();
	process.chdir(E2E_DIR);
	try {
		const env = await import(resolve(E2E_DIR, "env.ts"));
		return {
			apiPort: env.E2E_API_PORT,
			webPort: env.E2E_WEB_PORT,
			apiUrl: env.API_BASE_URL,
			webUrl: env.WEB_BASE_URL,
			databaseUrl: env.DATABASE_URL_E2E,
		};
	} finally {
		process.chdir(previous);
	}
}

export async function loadPg() {
	return import(Bun.resolveSync("pg", E2E_DIR));
}

export async function loadPlaywright() {
	return import(Bun.resolveSync("@playwright/test", E2E_DIR));
}

export async function loadSeedAccounts() {
	return import(resolve(E2E_DIR, "seed-account.ts"));
}

export function readState(): InstanceState | undefined {
	if (!existsSync(STATE_FILE)) return undefined;
	return JSON.parse(readFileSync(STATE_FILE, "utf8")) as InstanceState;
}

export async function writeState(state: InstanceState): Promise<void> {
	await Bun.write(STATE_FILE, `${JSON.stringify(state, null, "\t")}\n`);
}

export async function gitHead(): Promise<string> {
	return (await $`git rev-parse HEAD`.cwd(REPO_ROOT).quiet().text()).trim();
}

export async function treeDigest(): Promise<string> {
	const status = await $`git status --porcelain=v1 -uall`
		.cwd(REPO_ROOT)
		.quiet()
		.text();
	const diff = await $`git diff HEAD --binary`.cwd(REPO_ROOT).quiet().text();
	const hash = createHash("sha256").update(status).update(diff);
	const untracked = await $`git ls-files --others --exclude-standard -z`.cwd(REPO_ROOT).quiet().text();
	for (const file of untracked.split("\0").filter(Boolean)) {
		hash.update(file).update(readFileSync(resolve(REPO_ROOT, file)));
	}
	return hash.digest("hex");
}

export function isGroupAlive(pgid: number): boolean {
	try {
		process.kill(-pgid, 0);
		return true;
	} catch {
		return false;
	}
}

export function stamp(): string {
	return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
}
