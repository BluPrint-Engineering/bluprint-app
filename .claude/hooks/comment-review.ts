#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { addedComments, type Comment, git, isRelevantFile, repoRoot } from "./comments";
import { block, readStdinJson, runHook } from "./lib";

interface StopInput {
	cwd?: string;
}

interface Verdict {
	keep: boolean;
	reason: string;
}

interface Candidate extends Comment {
	id: string;
	file: string;
	context: string;
}

const REVIEWER_ENV = "BLUPRINT_COMMENT_REVIEWER";

const REVIEW_SCHEMA = {
	type: "object",
	properties: {
		verdicts: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string" },
					keep: { type: "boolean" },
					reason: { type: "string" },
				},
				required: ["id", "keep", "reason"],
			},
		},
	},
	required: ["verdicts"],
};

const INSTRUCTION =
	"Delete these comments, or move what they say into a name, a type, an assertion or a test's name. The reviewer is independent and its verdict stands; don't reword a comment to get it past review (ADR 0057).";

function branchBase(root: string): string {
	for (const main of ["origin/main", "main"]) {
		const base = git(root, ["merge-base", "HEAD", main])?.trim();
		if (base) {
			return base;
		}
	}
	return "HEAD";
}

function changedFiles(root: string, base: string): string[] {
	const tracked = git(root, ["diff", base, "--name-only", "--diff-filter=AM"]) ?? "";
	const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]) ?? "";
	return [...new Set(`${tracked}\n${untracked}`.split("\n").filter(Boolean))]
		.map((relative) => path.join(root, relative))
		.filter((file) => isRelevantFile(file) && existsSync(file));
}

function contextAround(text: string, line: number): string {
	const lines = text.split("\n");
	const start = Math.max(0, line - 4);
	return lines
		.slice(start, line + 8)
		.map((l, i) => `${start + i + 1}| ${l}`)
		.join("\n");
}

async function candidates(root: string): Promise<Candidate[]> {
	const base = branchBase(root);
	const found: Candidate[] = [];
	for (const file of changedFiles(root, base)) {
		const relative = path.relative(root, file).replaceAll(path.sep, "/");
		const text = readFileSync(file, "utf8");
		const before = git(root, ["show", `${base}:${relative}`]);
		for (const comment of await addedComments(root, file, before === null ? [] : [before], text)) {
			const id = createHash("sha1").update(`${relative}\0${comment.text}`).digest("hex").slice(0, 12);
			found.push({ ...comment, id, file: relative, context: contextAround(text, comment.line) });
		}
	}
	return found;
}

function cachePath(root: string): string {
	return path.resolve(root, git(root, ["rev-parse", "--git-path", "bluprint-comment-review.json"])?.trim() ?? "");
}

function readCache(file: string): Record<string, Verdict> {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return {};
	}
}

function reviewPrompt(rule: string, pending: Candidate[]): string {
	const items = pending
		.map((c) => `<comment id="${c.id}" file="${c.file}" line="${c.line}">\n${c.context}\n</comment>`)
		.join("\n\n");
	return `You review code comments another agent just added to this repository. That agent tends to argue for its own comments, which is why you, not it, decide. Judge each comment strictly against the rule below. Default to delete: keep a comment only when a competent reader would get something wrong without it (a hazard, a unit, a workaround and where it came from), it fits on one line, and no rename, type or assertion could say it instead. You may Read or Grep the repository to check whether the code already says it.

<rule>
${rule}
</rule>

<comments>
${items}
</comments>

Return one verdict per comment id. The reason is one sentence addressed to the author: what to do instead.`;
}

function review(root: string, pending: Candidate[]): Record<string, Verdict> {
	const rule = readFileSync(path.join(root, ".claude/rules/code-comments.md"), "utf8");
	const result = spawnSync(
		"claude",
		[
			"-p",
			reviewPrompt(rule, pending),
			"--model",
			"sonnet",
			"--setting-sources",
			"user",
			"--tools",
			"Read,Grep,Glob",
			"--permission-mode",
			"dontAsk",
			"--no-session-persistence",
			"--output-format",
			"json",
			"--json-schema",
			JSON.stringify(REVIEW_SCHEMA),
		],
		{
			cwd: root,
			encoding: "utf8",
			timeout: 170_000,
			maxBuffer: 10 * 1024 * 1024,
			env: { ...process.env, [REVIEWER_ENV]: "1" },
		},
	);
	if (result.status !== 0) {
		throw new Error(`reviewer exited ${result.status}: ${result.stderr || result.error?.message}`);
	}
	const { structured_output } = JSON.parse(result.stdout) as {
		structured_output?: { verdicts: ({ id: string } & Verdict)[] };
	};
	const ids = new Set(pending.map((c) => c.id));
	return Object.fromEntries(
		(structured_output?.verdicts ?? [])
			.filter((v) => ids.has(v.id))
			.map((v) => [v.id, { keep: v.keep, reason: v.reason }]),
	);
}

function describe(c: Candidate, why: string): string {
	return `- ${c.file}:${c.line} ${c.text.trim().split("\n")[0]}\n  ${why}`;
}

async function main(): Promise<void> {
	if (process.env[REVIEWER_ENV]) {
		return;
	}
	const { cwd = process.cwd() } = await readStdinJson<StopInput>();
	const root = repoRoot(cwd);
	if (!root) {
		return;
	}

	const found = await candidates(root);
	const banned = found.filter((c) => c.ban);
	const judged = found.filter((c) => !c.ban);

	const cacheFile = cachePath(root);
	const cache = readCache(cacheFile);
	const pending = judged.filter((c) => !(c.id in cache));
	if (pending.length > 0) {
		Object.assign(cache, review(root, pending));
		writeFileSync(cacheFile, JSON.stringify(cache, null, "\t"));
	}

	const rejected = judged.filter((c) => cache[c.id]?.keep === false);
	if (banned.length === 0 && rejected.length === 0) {
		return;
	}
	const lines = [
		...banned.map((c) => describe(c, `Banned outright: ${c.ban}.`)),
		...rejected.map((c) => describe(c, cache[c.id]?.reason ?? "")),
	];
	block(`Comment review rejected comments this branch adds:\n${lines.join("\n")}\n\n${INSTRUCTION}`);
}

runHook("comment-review", main);
