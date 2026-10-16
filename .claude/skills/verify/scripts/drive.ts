#!/usr/bin/env bun
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { describeError } from "../../../../scripts/worktree-core";
import { EVIDENCE_ROOT, isGroupAlive, loadPg, loadPlaywright, loadSeedAccounts, readState, stamp } from "./lib";

const DEVICES = {
	phone: { descriptor: "iPhone 13", browser: "webkit" },
	desktop: { descriptor: "Desktop Chrome", browser: "chromium" },
} as const;
type Device = keyof typeof DEVICES;
const SIGN_INS = ["admin", "manager", "assistant", "none"] as const;
type SignIn = (typeof SIGN_INS)[number];

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		device: { type: "string", default: "both" },
		as: { type: "string", default: "admin" },
		out: { type: "string" },
	},
});

function fail(message: string): never {
	console.error(`verify: ${message}`);
	process.exit(1);
}

const journeyPath = positionals[0];
if (!journeyPath) {
	fail("usage: bun .claude/skills/verify/scripts/drive.ts <journey.ts> [--device phone|desktop|both] [--as admin|manager|assistant|none] [--out <dir>]");
}
const devices: Device[] = values.device === "both" ? ["phone", "desktop"] : [values.device as Device];
if (!devices.every((device) => device in DEVICES)) fail(`unknown --device "${values.device}"`);
if (!SIGN_INS.includes(values.as as SignIn)) fail(`unknown --as "${values.as}"`);
const signIn = values.as as SignIn;

const state = readState();
if (!state || !isGroupAlive(state.apiPgid) || !isGroupAlive(state.webPgid)) {
	fail("no running instance for this checkout; run `bun .claude/skills/verify/scripts/instance.ts up` first.");
}

const journeyName = basename(journeyPath).replace(/\.[^.]+$/, "");
const run = `${journeyName}-${signIn}`;
const out = resolve(values.out ?? resolve(EVIDENCE_ROOT, `${stamp()}-${journeyName}`));
mkdirSync(out, { recursive: true });

const journey = (await import(resolve(journeyPath))).default;
if (typeof journey !== "function") fail(`${journeyPath} must default-export an async function`);

const { chromium, webkit, devices: descriptors, expect } = await loadPlaywright();
const accounts = await loadSeedAccounts();
const { Client } = await loadPg();
const db = new Client({ connectionString: state.databaseUrl });
await db.connect();
await db.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
const query = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows;

let failed = false;
for (const device of devices) {
	const { descriptor, browser: browserName } = DEVICES[device];
	const log = resolve(out, `${run}-${device}.log`);
	const note = (line: string) => appendFileSync(log, `${new Date().toISOString()} ${line}\n`);
	const browser = await (browserName === "webkit" ? webkit : chromium).launch();
	const context = await browser.newContext({
		...descriptors[descriptor],
		baseURL: state.webUrl,
		extraHTTPHeaders: { "x-forwarded-for": `10.${[...randomBytes(3)].join(".")}` },
		recordVideo: { dir: resolve(out, `${run}-${device}-video`) },
	});
	await context.tracing.start({ screenshots: true, snapshots: true });
	const page = await context.newPage();
	page.on("console", (message) => {
		if (["error", "warning"].includes(message.type())) note(`console.${message.type()}: ${message.text()}`);
	});
	page.on("pageerror", (error) => note(`pageerror: ${error.message}`));
	page.on("response", (response) => {
		if (response.status() >= 400) note(`http ${response.status()} ${response.request().method()} ${response.url()}`);
	});

	let shots = 0;
	const shot = async (name: string) => {
		shots += 1;
		const file = resolve(out, `${run}-${device}-${String(shots).padStart(2, "0")}-${name}.png`);
		await page.screenshot({ path: file, fullPage: true });
		note(`shot ${basename(file)} at ${page.url()}`);
		return file;
	};

	try {
		if (signIn !== "none") {
			await page.goto("/login");
			const email = { admin: accounts.ADMIN_EMAIL, manager: accounts.MANAGER_EMAIL, assistant: accounts.ASSISTANT_EMAIL }[signIn];
			await page.getByLabel("E-mail").fill(email);
			await page.getByLabel("Senha", { exact: true }).fill(accounts.SEED_PASSWORD);
			await page.getByRole("button", { name: "Entrar" }).click();
			await expect(page).toHaveURL("/projects");
			note(`signed in as ${signIn}`);
		}
		await journey({ page, context, shot, note, expect, query, device, accounts, baseURL: state.webUrl });
		note("journey passed");
		console.log(`verify: ${journeyName} passed on ${device}`);
	} catch (error) {
		failed = true;
		await shot("failure").catch(() => undefined);
		note(`journey failed: ${describeError(error)}`);
		console.error(`verify: ${journeyName} FAILED on ${device}: ${describeError(error)}`);
	} finally {
		await context.tracing.stop({ path: resolve(out, `${run}-${device}-trace.zip`) });
		await context.close();
		await browser.close();
	}
}
await db.end();
console.log(`verify: evidence in ${out}`);
if (failed) process.exit(1);
