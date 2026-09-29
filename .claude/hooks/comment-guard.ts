#!/usr/bin/env bun
// PreToolUse denies the comments code-comments.md rules out; PostToolUse nudges on the rest (ADR 0048, ADR 0057).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Node } from "typescript";
import { block, readStdinJson, runHook } from "./lib";

interface EditWriteInput {
	hook_event_name?: string;
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
		old_string?: string;
		new_string?: string;
		replace_all?: boolean;
		content?: string;
	};
}

type Ban = "test file" | "component or prop JSDoc";

interface Comment {
	text: string;
	ban: Ban | null;
}

const NUDGE =
	"Per .claude/rules/code-comments.md the default is no comment: would a competent reader get something wrong without it? If not, delete it, or rename so the code says it.";

const POINTER_NUDGE =
	"Per .claude/rules/code-comments.md: a pointer alone says nothing. State the hazard in the comment and cite the ADR as a suffix, e.g. (ADR 0013); or delete it.";

const DENIAL =
	"No comments in tests, and no JSDoc on a component or a prop (.claude/rules/code-comments.md, ADR 0057). Make the edit again without them; what they say belongs in a name, a type or the test's name.";

// A comment whose whole content is `docs/adr/...` or `ADR nnnn`, optionally prefixed by "see".
const BARE_ADR_POINTER = /^(?:see\s+)?\(?(?:docs\/adr\/\S+?|ADR\s*\d{4})\)?\.?$/i;

const DIRECTIVE =
	/^(?:\/\/\/\s*<reference|\/[/*]\s*(?:biome-ignore|eslint-disable|eslint-enable|prettier-ignore|@ts-|@vitest-environment|@jest-environment))/;

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

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

function isTestFile(filePath: string): boolean {
	return (
		/\.(test|spec|int-spec)\.tsx?$/.test(filePath) ||
		filePath.replaceAll(path.sep, "/").includes("/apps/e2e/")
	);
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

function isComponentOrProps(ts: typeof import("typescript"), node: Node): boolean {
	if (ts.isPropertySignature(node)) {
		return true;
	}
	if (ts.isFunctionDeclaration(node)) {
		return PASCAL_CASE.test(node.name?.text ?? "");
	}
	if (ts.isVariableStatement(node)) {
		const name = node.declarationList.declarations[0]?.name;
		return name !== undefined && ts.isIdentifier(name) && PASCAL_CASE.test(name.text);
	}
	if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
		return node.name.text.endsWith("Props");
	}
	return false;
}

// Parses the real AST, so JSX text and template-literal bodies are never mistaken for comment trivia.
function extractComments(
	ts: typeof import("typescript"),
	text: string,
	filePath: string,
): Comment[] {
	const isTsx = filePath.endsWith(".tsx");
	const inTest = isTestFile(filePath);
	const sourceFile = ts.createSourceFile(
		isTsx ? "guard.tsx" : "guard.ts",
		text,
		ts.ScriptTarget.Latest,
		false,
		isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);

	const seen = new Set<string>();
	const comments: Comment[] = [];
	// Pre-order visiting makes the outermost node at a position the owner of its leading comments.
	const collectAt = (pos: number, owner: Node | null) => {
		const ranges = [
			...(ts.getLeadingCommentRanges(text, pos) ?? []),
			...(ts.getTrailingCommentRanges(text, pos) ?? []),
		];
		for (const range of ranges) {
			const key = `${range.pos}:${range.end}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			const comment = text.slice(range.pos, range.end);
			if (DIRECTIVE.test(comment)) {
				continue;
			}
			let ban: Ban | null = null;
			if (inTest) {
				ban = "test file";
			} else if (isTsx && comment.startsWith("/**") && owner && isComponentOrProps(ts, owner)) {
				ban = "component or prop JSDoc";
			}
			comments.push({ text: comment, ban });
		}
	};

	const visit = (node: Node) => {
		// JsxText's own content starts at getFullStart(): scanning it for "//" would misread literal JSX text.
		// The SourceFile shares position 0 with the first statement, which must own a comment at the top of the file.
		if (node.kind !== ts.SyntaxKind.JsxText && !ts.isSourceFile(node)) {
			collectAt(node.getFullStart(), node);
		}
		// A comment-only `{/* ... */}` has no expression child to hang the comment on.
		if (ts.isJsxExpression(node) && !node.expression) {
			collectAt(node.getFullStart() + 1, null);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	collectAt(sourceFile.endOfFileToken.getFullStart(), null); // trivia after the last real token

	return comments;
}

// Comments in `newText` absent from every text in `baselines`, one-for-one.
async function addedComments(
	cwd: string,
	filePath: string,
	baselines: string[],
	newText: string,
): Promise<Comment[]> {
	const ts = await loadTypescript(cwd);
	const remaining = baselines.flatMap((text) => extractComments(ts, text, filePath).map((c) => c.text));
	const added: Comment[] = [];
	for (const comment of extractComments(ts, newText, filePath)) {
		const index = remaining.indexOf(comment.text);
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

function readDisk(filePath: string): string | null {
	try {
		return readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
}

// Union of HEAD and the index, so an already-staged comment isn't re-reported.
function gitBaselines(cwd: string, filePath: string): string[] {
	const root = repoRoot(cwd);
	if (!root) {
		return [];
	}
	const relative = path.relative(root, filePath).replaceAll(path.sep, "/");
	return [readGitBlob(root, `HEAD:${relative}`), readGitBlob(root, `:${relative}`)].filter(
		(t): t is string => t !== null,
	);
}

// String.replace would expand `$&` and friends in `replacement`.
function applyEdit(text: string, search: string, replacement: string, all: boolean): string {
	if (all) {
		return text.split(search).join(replacement);
	}
	const index = text.indexOf(search);
	return index === -1 ? text : text.slice(0, index) + replacement + text.slice(index + search.length);
}

function bullets(comments: string[]): string {
	return comments.map((c) => `- ${c.trim()}`).join("\n");
}

function nudge(comments: Comment[]): void {
	const texts = comments.map((c) => c.text);
	if (texts.length === 0) {
		return;
	}
	const pointers = texts.filter(isBareAdrPointer);
	const others = texts.filter((c) => !isBareAdrPointer(c));
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

async function guard(cwd: string, filePath: string, input: EditWriteInput["tool_input"]): Promise<void> {
	const onDisk = readDisk(filePath);
	let newText: string;
	let baselines: string[];
	if (input?.content !== undefined) {
		newText = input.content;
		baselines = [...gitBaselines(cwd, filePath), ...(onDisk === null ? [] : [onDisk])];
	} else {
		if (onDisk === null) {
			return;
		}
		newText = applyEdit(onDisk, input?.old_string ?? "", input?.new_string ?? "", input?.replace_all === true);
		baselines = [onDisk];
	}

	const banned = (await addedComments(cwd, filePath, baselines, newText)).filter((c) => c.ban);
	if (banned.length > 0) {
		block(`${banned.map((c) => `- (${c.ban}) ${c.text.trim()}`).join("\n")}\n\n${DENIAL}`);
	}
}

async function main(): Promise<void> {
	const input = await readStdinJson<EditWriteInput>();
	const filePath = input.tool_input?.file_path;
	if (!filePath || !isRelevantFile(filePath)) {
		return;
	}
	const cwd = input.cwd ?? process.cwd();

	if (input.hook_event_name === "PreToolUse") {
		await guard(cwd, filePath, input.tool_input);
	} else if (input.tool_name === "Edit") {
		nudge(await addedComments(cwd, filePath, [input.tool_input?.old_string ?? ""], input.tool_input?.new_string ?? ""));
	} else if (input.tool_name === "Write") {
		nudge(await addedComments(cwd, filePath, gitBaselines(cwd, filePath), input.tool_input?.content ?? ""));
	}
}

runHook("comment-guard", main);
