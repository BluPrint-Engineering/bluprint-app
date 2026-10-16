#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync } from "node:fs";
import { connect } from "node:net";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";
import { describeError, isLinkedWorktree, resolveDatabaseUrl } from "../../../../scripts/worktree-core";
import {
	E2E_DIR,
	EVIDENCE_ROOT,
	gitHead,
	INSTANCE_DIR,
	isGroupAlive,
	loadE2eConfig,
	loadPg,
	loadSeedAccounts,
	REPO_ROOT,
	readState,
	stamp,
	treeDigest,
	writeState,
} from "./lib";

const COMPOSE_DEFAULT_DATABASE_URL = "postgresql://bluprint:bluprint@localhost:5432/bluprint";
const READY_TIMEOUT_MS = 90_000;
const STOP_TIMEOUT_MS = 10_000;
const PHASE_KILL_GRACE_MS = 5_000;
const API_LOG = resolve(INSTANCE_DIR, "api.log");
const WEB_LOG = resolve(INSTANCE_DIR, "web.log");

function fail(message: string): never {
	console.error(`verify: ${message}`);
	process.exit(1);
}

async function isListening(host: string, port: number): Promise<boolean> {
	return new Promise((done) => {
		const socket = connect({ host, port });
		socket.setTimeout(2000);
		socket.once("connect", () => {
			socket.destroy();
			done(true);
		});
		socket.once("timeout", () => {
			socket.destroy();
			done(false);
		});
		socket.once("error", () => done(false));
	});
}

async function isPortTaken(port: number): Promise<boolean> {
	return (await isListening("127.0.0.1", port)) || (await isListening("::1", port));
}

async function listenerPids(port: number): Promise<number[]> {
	const result = await $`lsof -nP -t -iTCP:${port} -sTCP:LISTEN`.nothrow().quiet();
	return result.stdout
		.toString()
		.split("\n")
		.filter(Boolean)
		.map(Number);
}

async function pgidOf(pid: number): Promise<number | undefined> {
	const result = await $`ps -o pgid= -p ${pid}`.nothrow().quiet();
	const pgid = Number(result.stdout.toString().trim());
	return Number.isFinite(pgid) && pgid > 0 ? pgid : undefined;
}

function spawnGroup(command: string[], cwd: string, env: NodeJS.ProcessEnv, logPath: string): number {
	const [file, ...args] = command;
	if (!file) throw new Error("empty command");
	const log = openSync(logPath, "a");
	try {
		const child = spawn(file, args, { cwd, env, detached: true, stdio: ["ignore", log, log] });
		child.unref();
		if (!child.pid) throw new Error(`could not start ${command.join(" ")}`);
		return child.pid;
	} finally {
		closeSync(log);
	}
}

async function runPlain(command: $.ShellPromise): Promise<void> {
	const { exitCode, stdout, stderr } = await command.nothrow().quiet();
	process.stdout.write(Bun.stripANSI(stdout.toString()));
	process.stderr.write(Bun.stripANSI(stderr.toString()));
	if (exitCode !== 0) throw new Error(`setup command exited with code ${exitCode}`);
}

function tail(path: string, lines = 30): string {
	if (!existsSync(path)) return "(no log)";
	return readFileSync(path, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
}

async function healthThroughWeb(webUrl: string): Promise<{ status?: string; database?: string } | undefined> {
	try {
		const response = await fetch(`${webUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
		if (!response.ok) return undefined;
		return (await response.json()) as { status?: string; database?: string };
	} catch {
		return undefined;
	}
}

async function ensurePostgres(): Promise<void> {
	let baseUrl: string;
	try {
		baseUrl = resolveDatabaseUrl(REPO_ROOT);
	} catch {
		baseUrl = COMPOSE_DEFAULT_DATABASE_URL;
		process.env.DATABASE_URL = baseUrl;
	}
	const { hostname, port } = new URL(baseUrl);
	if (!(await isListening(hostname, Number(port) || 5432))) {
		fail(
			`Postgres is not reachable at ${hostname}:${port || 5432}. Start the shared container with \`docker compose up -d --wait\` from the repo root (never stop or remove it: every worktree uses it), then rerun.`,
		);
	}
}

function refuseRunningInstance(): void {
	const existing = readState();
	if (existing && (isGroupAlive(existing.apiPgid) || isGroupAlive(existing.webPgid))) {
		fail(`an instance is already running at ${existing.webUrl}; run \`doctor\`, or \`down\` first.`);
	}
}

async function up(): Promise<void> {
	refuseRunningInstance();
	rmSync(INSTANCE_DIR, { recursive: true, force: true });

	process.env.NO_COLOR = "1";
	process.env.FORCE_COLOR = "0";
	await ensurePostgres();
	process.env.BETTER_AUTH_SECRET ||= randomBytes(32).toString("base64");
	if ((await isLinkedWorktree(REPO_ROOT)) && !existsSync(resolve(REPO_ROOT, ".env.local"))) {
		await runPlain($`bun run worktree:setup`.cwd(REPO_ROOT));
	}

	const config = await loadE2eConfig();
	for (const port of [config.apiPort, config.webPort]) {
		if (await isPortTaken(port)) {
			const owners = await listenerPids(port);
			fail(
				`port ${port} is already in use (pid ${owners.join(", ") || "unknown"}). Another \`bun run e2e\` or verify instance from this checkout is running; stop that one first, never a process you did not start.`,
			);
		}
	}

	const head = await gitHead();
	const digest = await treeDigest();
	await runPlain($`bun run --filter @bluprint/shared build`.cwd(REPO_ROOT));
	await runPlain($`bun run --filter @bluprint/api build`.cwd(REPO_ROOT));
	await runPlain(
		$`bun run --filter @bluprint/web build`.cwd(REPO_ROOT).env({ ...process.env, VITE_ALLOW_SELF_SIGNUP: "true" }),
	);
	await runPlain($`bun prepare-database.ts`.cwd(E2E_DIR));

	mkdirSync(INSTANCE_DIR, { recursive: true });
	const apiPgid = spawnGroup(
		["bun", "run", "start"],
		resolve(REPO_ROOT, "apps/api"),
		{
			...process.env,
			PORT: String(config.apiPort),
			DATABASE_URL: config.databaseUrl,
			CORS_ORIGIN: config.webUrl,
			BETTER_AUTH_URL: config.apiUrl,
			ALLOW_SELF_SIGNUP: "true",
			PASSWORD_BREACH_CHECK: "false",
		},
		API_LOG,
	);
	const webPgid = spawnGroup(
		["bunx", "vite", "preview", "--port", String(config.webPort), "--strictPort"],
		resolve(REPO_ROOT, "apps/web"),
		{ ...process.env, PORT: String(config.apiPort) },
		WEB_LOG,
	);
	await writeState({
		apiPgid,
		webPgid,
		apiUrl: config.apiUrl,
		webUrl: config.webUrl,
		databaseUrl: config.databaseUrl,
		head,
		treeDigest: digest,
		startedAt: new Date().toISOString(),
	});

	const deadline = Date.now() + READY_TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (!isGroupAlive(apiPgid) || !isGroupAlive(webPgid)) break;
		const health = await healthThroughWeb(config.webUrl);
		if (health?.status === "ok" && health.database === "up") {
			console.log(`verify: ready
  web       ${config.webUrl}   (open this one; it proxies /api to the API)
  api       ${config.apiUrl}
  database  ${config.databaseUrl}   (seeded by apps/api/src/db/seed)
  logs      ${INSTANCE_DIR}
  evidence  ${EVIDENCE_ROOT}`);
			return;
		}
		await Bun.sleep(1000);
	}
	console.error(`--- api.log ---\n${tail(API_LOG)}\n--- web.log ---\n${tail(WEB_LOG)}`);
	fail("the instance did not become ready; read the logs above, then run `down` before retrying.");
}

async function doctor(): Promise<void> {
	const state = readState();
	if (!state) fail("no instance recorded for this checkout; run `up`.");
	let healthy = true;
	const report = (ok: boolean, check: string, detail: string) => {
		healthy &&= ok;
		console.log(`${ok ? "ok  " : "FAIL"} ${check}: ${detail}`);
	};

	for (const [name, pgid, url] of [
		["api", state.apiPgid, state.apiUrl],
		["web", state.webPgid, state.webUrl],
	] as const) {
		const alive = isGroupAlive(pgid);
		report(alive, `${name} process`, alive ? `group ${pgid} running` : `group ${pgid} is gone`);
		const port = Number(new URL(url).port);
		const owners = await listenerPids(port);
		const groups = await Promise.all(owners.map(pgidOf));
		const ours = groups.includes(pgid);
		report(
			ours,
			`${name} port ${port}`,
			ours ? "held by our process group" : `held by pid ${owners.join(", ") || "nobody"}, not by group ${pgid}`,
		);
	}

	const health = await healthThroughWeb(state.webUrl);
	report(
		health?.status === "ok" && health.database === "up",
		"health via web proxy",
		health ? JSON.stringify(health) : `${state.webUrl}/api/health did not answer`,
	);

	try {
		const { ADMIN_EMAIL } = await loadSeedAccounts();
		const { Client } = await loadPg();
		const client = new Client({ connectionString: state.databaseUrl });
		await client.connect();
		try {
			const { rows } = await client.query('SELECT count(*)::int AS n FROM "user" WHERE email = $1', [ADMIN_EMAIL]);
			report(rows[0].n === 1, "seed", rows[0].n === 1 ? `${ADMIN_EMAIL} exists` : `${ADMIN_EMAIL} missing; rerun \`up\``);
		} finally {
			await client.end();
		}
	} catch (error) {
		report(false, "seed", describeError(error));
	}

	const fresh = state.head === (await gitHead()) && state.treeDigest === (await treeDigest());
	report(
		fresh,
		"build",
		fresh ? `serves the checkout as of ${state.startedAt}` : "the checkout changed since `up`; run `down` then `up` to serve it",
	);

	if (!healthy) process.exit(1);
}

async function down(): Promise<void> {
	const state = readState();
	if (!state) {
		console.log("verify: no instance recorded for this checkout.");
		return;
	}
	const groups = [state.apiPgid, state.webPgid];
	for (const pgid of groups) {
		if (isGroupAlive(pgid)) process.kill(-pgid, "SIGTERM");
	}
	const deadline = Date.now() + STOP_TIMEOUT_MS;
	while (groups.some(isGroupAlive) && Date.now() < deadline) await Bun.sleep(200);
	for (const pgid of groups) {
		if (isGroupAlive(pgid)) process.kill(-pgid, "SIGKILL");
	}
	rmSync(INSTANCE_DIR, { recursive: true, force: true });
	console.log(`verify: stopped process groups ${groups.join(", ")}; evidence kept in ${EVIDENCE_ROOT}`);
}

const INSTANCE_SCRIPT = import.meta.path;
const DRIVE_SCRIPT = resolve(import.meta.dirname, "drive.ts");
const LOGIN_JOURNEY = resolve(import.meta.dirname, "../journeys/login.ts");
const JOURNEY_SIGN_IN = /^(.+)@(admin|manager|assistant|none)$/;

async function runPhase(name: string, args: string[], signal?: AbortSignal): Promise<{ ok: boolean; output: string }> {
	const started = Date.now();
	const child = Bun.spawn([process.execPath, ...args], {
		cwd: REPO_ROOT,
		env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
		stdout: "pipe",
		stderr: "pipe",
		signal,
	});
	let killTimer: Timer | undefined;
	const killAfterGrace = () => {
		killTimer = setTimeout(() => child.kill("SIGKILL"), PHASE_KILL_GRACE_MS);
	};
	signal?.addEventListener("abort", killAfterGrace, { once: true });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]).finally(() => {
		clearTimeout(killTimer);
		signal?.removeEventListener("abort", killAfterGrace);
	});
	const output = Bun.stripANSI(`${stdout}${stderr}`).trimEnd();
	const ok = exitCode === 0;
	console.log(`${ok ? "ok  " : "FAIL"} ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
	return { ok, output };
}

function drivePhase(journeyArg: string, out: string): [string, string[]] {
	const [, path = journeyArg, signIn = "admin"] = journeyArg.match(JOURNEY_SIGN_IN) ?? [];
	const journey = resolve(path);
	return [
		`drive ${basename(journey)} --as ${signIn} (phone + desktop)`,
		[DRIVE_SCRIPT, journey, "--as", signIn, "--out", out],
	];
}

async function check(): Promise<void> {
	const { values } = parseArgs({
		args: process.argv.slice(3),
		options: { out: { type: "string" }, journey: { type: "string", multiple: true, default: [] } },
	});
	refuseRunningInstance();
	const out = resolve(values.out ?? resolve(EVIDENCE_ROOT, `${stamp()}-check`));
	const phases: [string, string[]][] = [
		["up", [INSTANCE_SCRIPT, "up"]],
		["doctor", [INSTANCE_SCRIPT, "doctor"]],
		...[`${LOGIN_JOURNEY}@none`, ...values.journey].map((journey) => drivePhase(journey, out)),
	];
	const interrupt = new AbortController();
	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
		process.on(signal, () => interrupt.abort(signal));
	}
	let failure: { name: string; output: string } | undefined;
	try {
		for (const [name, args] of phases) {
			const { ok, output } = await runPhase(name, args, interrupt.signal);
			if (interrupt.signal.aborted) {
				failure = { name, output: `${output}\ninterrupted by ${interrupt.signal.reason}`.trimStart() };
				break;
			}
			if (!ok) {
				failure = { name, output };
				break;
			}
		}
	} finally {
		const stopped = await runPhase("down", [INSTANCE_SCRIPT, "down"]);
		if (!stopped.ok) failure ??= { name: "down", output: stopped.output };
	}
	if (failure) {
		console.error(`--- ${failure.name} ---\n${failure.output}`);
		fail(`check failed at ${failure.name}; evidence in ${out}`);
	}
	console.log(`verify: check passed; evidence in ${out}`);
}

const commands: Record<string, () => Promise<void>> = { up, doctor, down, check };
const command = commands[process.argv[2] ?? ""];
if (!command) fail("usage: bun .claude/skills/verify/scripts/instance.ts <up|doctor|down|check [--out <dir>] [--journey <journey.ts>[@admin|manager|assistant|none]]...>");
try {
	await command();
} catch (error) {
	fail(describeError(error));
}
