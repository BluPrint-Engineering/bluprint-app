#!/usr/bin/env bun
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
	buildBundle,
	digest,
	manifestSchema,
	safeArtifactName,
	transportProblem,
} from "./screen-bundle";

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

async function build(source: string) {
	const dir = await mkdtemp(join(tmpdir(), "bluprint-screen-"));
	for (const artifact of await buildBundle(source, dir))
		console.log(artifact.file);
	console.log(dir);
}

async function publish(issue: string, dir: string, only: string[]) {
	if (
		!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/.test(issue)
	)
		throw new Error("Use a full GitHub issue URL");
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")),
	);
	const unknown = only.filter(
		(file) => !manifest.artifacts.some((artifact) => artifact.file === file),
	);
	if (unknown.length)
		throw new Error(`Not in the manifest: ${unknown.join(", ")}`);
	const selected = only.length
		? manifest.artifacts.filter((artifact) => only.includes(artifact.file))
		: manifest.artifacts;
	for (const artifact of selected) {
		if (!safeArtifactName(artifact.file))
			throw new Error(`GitHub rewrites this artifact name: ${artifact.file}`);
		const body = await readFile(join(dir, artifact.file));
		if (digest(body) !== artifact.sha256)
			throw new Error(`Changed after build: ${artifact.file}`);
		const problem = transportProblem(body.toString("utf8"));
		if (problem)
			throw new Error(
				`GitHub rewrites ${problem} in transit; rebuild: ${artifact.file}`,
			);
	}
	const verification = await mkdtemp(
		join(tmpdir(), "bluprint-artifact-download-"),
	);
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
	let existing = await list();
	for (const artifact of selected) {
		const prior = existing.find((entry) => entry.name === artifact.file);
		if (prior)
			await command([
				"gh",
				"issue",
				"artifact",
				"edit",
				issue,
				String(prior.number),
				"--body-file",
				join(dir, artifact.file),
			]);
		else
			await command([
				"gh",
				"issue",
				"artifact",
				"create",
				issue,
				join(dir, artifact.file),
			]);
		existing = await list();
		const published = existing.find((entry) => entry.name === artifact.file);
		if (!published)
			throw new Error(`Missing published artifact: ${artifact.file}`);
		const downloaded = join(verification, `${published.number}.html`);
		await command([
			"gh",
			"issue",
			"artifact",
			"download",
			issue,
			String(published.number),
			"--output",
			downloaded,
		]);
		if (digest(await readFile(downloaded)) !== artifact.sha256)
			throw new Error(`Round-trip mismatch: ${published.url}`);
		const version = (
			await command([
				"gh",
				"issue",
				"artifact",
				"view",
				issue,
				String(published.number),
				"--json",
				"versions",
				"--jq",
				"[.versions[].version] | max",
			])
		).trim();
		console.log(
			`${published.url}\tversion ${version}\t${artifact.sha256}\t${artifact.file}`,
		);
	}
}

const [operation, first, second, ...rest] = Bun.argv.slice(2);
if (operation === "build" && first && !second) await build(resolve(first));
else if (operation === "publish" && first && second)
	await publish(first, resolve(second), rest);
else
	throw new Error(
		"Usage: bun screen-artifacts.ts build <trusted-screen-dir> | publish <issue-url> <bundle-dir> [artifact-file ...]",
	);
