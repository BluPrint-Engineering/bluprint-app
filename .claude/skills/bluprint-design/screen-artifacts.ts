#!/usr/bin/env bun
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { buildBundle, type GallerySpec, stageVersion } from "./screen-bundle";

const prototypesRepo = "BluPrint-Engineering/bluprint-prototypes";

// The issue page dropped its whole Artifacts section on issues with 24 and 40 artifacts while 13 still showed (2026-11-12).
const maxArtifactsPerIssue = 10;

const publishedSchema = z.array(
	z.object({
		name: z.string(),
		number: z.number().int().positive(),
		url: z.url(),
	}),
);

async function command(args: string[]) {
	const child = Bun.spawn(args, {
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code !== 0)
		throw new Error(`${args[0]} ${args[1]} failed: ${stderr || stdout}`);
	return stdout;
}

async function build(source: string, options: string[]) {
	const galleries: GallerySpec[] = [];
	for (let index = 0; index < options.length; index += 2) {
		const spec = options[index + 1];
		const separator = spec?.indexOf("=") ?? -1;
		if (options[index] !== "--gallery" || !spec || separator < 1)
			throw new Error('Use --gallery "<page>.html=<state>,<prefix>*,..."');
		galleries.push({
			file: spec.slice(0, separator),
			states: spec
				.slice(separator + 1)
				.split(",")
				.filter(Boolean),
		});
	}
	const dir = await mkdtemp(join(tmpdir(), "bluprint-screen-"));
	for (const page of await buildBundle(
		source,
		dir,
		galleries.length ? galleries : undefined,
	))
		console.log(
			page.states.length ? `${page.file}\t${page.states.join(",")}` : page.file,
		);
	console.log(dir);
}

async function stage(bundle: string, clone: string, folder: string) {
	const sha = await stageVersion(bundle, clone, folder);
	console.log(sha);
	console.log(
		`Committed on main. After it is pushed (git -C ${clone} push origin main), link issues with: link <issue-url> ${sha} ${folder}/<page>.html "<name>"`,
	);
}

async function link(issue: string, sha: string, path: string, name: string) {
	if (
		!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/.test(issue)
	)
		throw new Error("Use a full GitHub issue URL");
	if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Use a full commit SHA");
	if (!/^[\p{L}\p{N} ._-]+$/u.test(name) || /\s{2}/.test(name))
		throw new Error(
			"Artifact names keep only letters, digits, spaces, '.', '-' and '_'",
		);
	await command([
		"gh",
		"api",
		`repos/${prototypesRepo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${sha}`,
		"--silent",
	]);
	const list = async () =>
		publishedSchema.parse(
			JSON.parse(
				await command([
					"gh",
					"issue",
					"artifact",
					"list",
					issue,
					"--json",
					"name,number,url",
				]),
			),
		);
	const existing = await list();
	if (existing.some((entry) => entry.name === name))
		throw new Error(`${issue} already has an artifact named ${name}`);
	if (existing.length + 1 > maxArtifactsPerIssue)
		throw new Error(
			`${issue} would hold ${existing.length + 1} artifacts; the issue page lists at most ${maxArtifactsPerIssue}`,
		);
	const url = `https://github.com/${prototypesRepo}/blob/${sha}/${path}`;
	await command([
		"gh",
		"issue",
		"artifact",
		"create",
		issue,
		url,
		"--name",
		name,
	]);
	const created = (await list()).find((entry) => entry.name === name);
	if (!created) throw new Error(`Missing link artifact: ${name}`);
	console.log(`${created.url}\t${url}`);
}

const [operation, first, second, third, ...rest] = Bun.argv.slice(2);
if (operation === "build" && first)
	await build(
		resolve(first),
		[second, third, ...rest].filter((arg) => arg !== undefined),
	);
else if (operation === "stage" && first && second && third && !rest.length)
	await stage(resolve(first), resolve(second), third);
else if (operation === "link" && first && second && third && rest.length === 1)
	await link(first, second, third, rest[0] ?? "");
else
	throw new Error(
		'Usage: bun screen-artifacts.ts build <trusted-screen-dir> [--gallery "<page>.html=<states>"]... | stage <bundle-dir> <prototypes-clone> <screen>/v<n> | link <issue-url> <commit-sha> <path> "<name>"',
	);
