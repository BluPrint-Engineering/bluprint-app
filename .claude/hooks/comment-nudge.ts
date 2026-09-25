#!/usr/bin/env bun
// PostToolUse nudge for Edit/Write (ADR 0048).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readStdinJson, runHook } from "./lib";

interface PostToolUseInput {
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
		old_string?: string;
		new_string?: string;
		content?: string;
	};
}

const NUDGE =
	"Per .claude/rules/code-comments.md: would deleting this lose something the code, a name or a test can't say? If not, delete it.";

const POINTER_NUDGE =
	"Per .claude/rules/code-comments.md: a pointer alone says nothing. State the hazard in the comment and cite the ADR as a suffix, e.g. (ADR 0013); or delete it.";

// A comment whose whole content is `docs/adr/...` or `ADR nnnn`, optionally prefixed by "see".
const BARE_ADR_POINTER = /^(?:see\s+)?\(?(?:docs\/adr\/\S+?|ADR\s*\d{4})\)?\.?$/i;

function isBareAdrPointer(comment: string): boolean {
	const content = comment
		.replace(/^\/\/|^\/\*+|\*+\/$/g, "")
		.replace(/^\s*\*/gm, "")
		.trim();
	return BARE_ADR_POINTER.test(content);
}

function isRelevantFile(filePath: string): boolean {
	if (!/\.(ts|tsx)$/.test(filePath)) {
		return false;
	}
	if (path.basename(filePath) === "routeTree.gen.ts") {
		return false;
	}
	if (filePath.replaceAll(path.sep, "/").includes("/apps/api/drizzle/")) {
		return false;
	}
	return true;
}

// Root "typescript" (7.x) is a native-compiler stub with no parser API; resolve apps/api's 5.x instead.
async function loadTypescript(cwd: string): Promise<typeof import("typescript")> {
	try {
		const resolved = Bun.resolveSync("typescript", path.join(cwd, "apps/api") + path.sep);
		return await import(resolved);
	} catch {
		return await import("typescript");
	}
}

// Parses the real AST, so JSX text and template-literal bodies are never mistaken for comment trivia.
function extractComments(ts: typeof import("typescript"), text: string, isTsx: boolean): string[] {
	const sourceFile = ts.createSourceFile(
		isTsx ? "nudge.tsx" : "nudge.ts",
		text,
		ts.ScriptTarget.Latest,
		false,
		isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);

	const seen = new Set<string>();
	const comments: string[] = [];
	const collectAt = (pos: number) => {
		const ranges = [
			...(ts.getLeadingCommentRanges(text, pos) ?? []),
			...(ts.getTrailingCommentRanges(text, pos) ?? []),
		];
		for (const range of ranges) {
			const key = `${range.pos}:${range.end}`;
			if (!seen.has(key)) {
				seen.add(key);
				comments.push(text.slice(range.pos, range.end));
			}
		}
	};

	const visit = (node: import("typescript").Node) => {
		// JsxText's own content starts at getFullStart(): scanning it for "//" would misread literal JSX text.
		if (node.kind !== ts.SyntaxKind.JsxText) {
			collectAt(node.getFullStart());
		}
		// A comment-only `{/* ... */}` has no expression child to hang the comment on.
		if (node.kind === ts.SyntaxKind.JsxExpression && !(node as { expression?: unknown }).expression) {
			collectAt(node.getFullStart() + 1);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	collectAt(sourceFile.endOfFileToken.getFullStart()); // trivia after the last real token

	return comments;
}

// Comments in `newText` absent from every text in `baselines`, one-for-one.
async function addedComments(
	cwd: string,
	baselines: string[],
	newText: string,
	isTsx: boolean,
): Promise<string[]> {
	const ts = await loadTypescript(cwd);
	const remaining = baselines.flatMap((text) => extractComments(ts, text, isTsx));
	const added: string[] = [];
	for (const comment of extractComments(ts, newText, isTsx)) {
		const index = remaining.indexOf(comment);
		if (index === -1) {
			added.push(comment);
		} else {
			remaining.splice(index, 1);
		}
	}
	return added;
}

function repoRoot(cwd: string): string | null {
	const result = spawnSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
	return result.status === 0 ? result.stdout.trim() : null;
}

function readGitBlob(root: string, spec: string): string | null {
	const result = spawnSync("git", ["-C", root, "show", spec], {
		encoding: "utf8",
		maxBuffer: 10 * 1024 * 1024,
	});
	return result.status === 0 ? result.stdout : null;
}

function bullets(comments: string[]): string {
	return comments.map((c) => `- ${c.trim()}`).join("\n");
}

function emit(comments: string[]): void {
	if (comments.length === 0) {
		return;
	}
	const pointers = comments.filter(isBareAdrPointer);
	const others = comments.filter((c) => !isBareAdrPointer(c));
	const sections: string[] = [];
	if (pointers.length > 0) {
		sections.push(`ADR pointers added by this edit:\n${bullets(pointers)}\n\n${POINTER_NUDGE}`);
	}
	if (others.length > 0) {
		sections.push(`Comments added by this edit:\n${bullets(others)}\n\n${NUDGE}`);
	}
	console.log(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: sections.join("\n\n"),
			},
		}),
	);
}

async function main(): Promise<void> {
	const input = await readStdinJson<PostToolUseInput>();
	const filePath = input.tool_input?.file_path;
	if (!filePath || !isRelevantFile(filePath)) {
		return;
	}

	const cwd = input.cwd ?? process.cwd();
	const isTsx = filePath.endsWith(".tsx");

	if (input.tool_name === "Edit") {
		const oldText = input.tool_input?.old_string ?? "";
		const newText = input.tool_input?.new_string ?? "";
		emit(await addedComments(cwd, [oldText], newText, isTsx));
	} else if (input.tool_name === "Write") {
		const newText = input.tool_input?.content ?? "";
		const root = repoRoot(cwd);
		let baselines: string[] = [];
		if (root) {
			const relative = path.relative(root, filePath).replaceAll(path.sep, "/");
			// Union of HEAD and the index, so an already-staged comment isn't re-reported.
			const versions = [readGitBlob(root, `HEAD:${relative}`), readGitBlob(root, `:${relative}`)];
			baselines = versions.filter((t): t is string => t !== null);
		}
		emit(await addedComments(cwd, baselines, newText, isTsx));
	}
}

runHook("comment-nudge", main);
