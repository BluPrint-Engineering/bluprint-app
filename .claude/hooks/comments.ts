import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface EditOrWriteInput {
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
		old_string?: string;
		new_string?: string;
		content?: string;
	};
}

export function isRelevantFile(filePath: string): boolean {
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

const TEST_FILE = /\.(?:spec|test|e2e-spec|int-spec)\.tsx?$/;
const TEST_DIRS = ["/apps/e2e/", "/apps/web/src/test/", "/apps/api/test/"];

export function isTestFile(filePath: string): boolean {
	const normalized = filePath.replaceAll(path.sep, "/");
	return TEST_FILE.test(normalized) || TEST_DIRS.some((dir) => normalized.includes(dir));
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
	collectAt(sourceFile.endOfFileToken.getFullStart());

	return comments;
}

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

function readFileOrNull(filePath: string): string | null {
	try {
		return readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
}

// A PreToolUse Write still sees the pre-edit file on disk; PostToolUse sees the new one, so it passes `withDisk: false`.
function writeBaselines(cwd: string, filePath: string, withDisk: boolean): string[] {
	const versions: (string | null)[] = withDisk ? [readFileOrNull(filePath)] : [];
	const root = repoRoot(cwd);
	if (root) {
		const relative = path.relative(root, filePath).replaceAll(path.sep, "/");
		versions.push(readGitBlob(root, `HEAD:${relative}`), readGitBlob(root, `:${relative}`));
	}
	return versions.filter((t): t is string => t !== null);
}

export async function commentsAddedBy(
	input: EditOrWriteInput,
	filePath: string,
	phase: "pre" | "post",
): Promise<string[]> {
	const cwd = input.cwd ?? process.cwd();
	const isTsx = filePath.endsWith(".tsx");
	if (input.tool_name === "Edit") {
		return addedComments(cwd, [input.tool_input?.old_string ?? ""], input.tool_input?.new_string ?? "", isTsx);
	}
	if (input.tool_name === "Write") {
		const baselines = writeBaselines(cwd, filePath, phase === "pre");
		return addedComments(cwd, baselines, input.tool_input?.content ?? "", isTsx);
	}
	return [];
}

export function bullets(comments: string[]): string {
	return comments.map((c) => `- ${c.trim()}`).join("\n");
}
