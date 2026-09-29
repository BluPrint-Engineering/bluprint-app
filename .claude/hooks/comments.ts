import { spawnSync } from "node:child_process";
import path from "node:path";
import type { Node } from "typescript";

type TypeScript = typeof import("typescript");

export type Ban = "test file" | "component or prop JSDoc";

export interface Comment {
	text: string;
	line: number;
	ban: Ban | null;
}

const DIRECTIVE =
	/^(?:\/\/\/\s*<reference|\/[/*]\s*(?:biome-ignore|eslint-disable|eslint-enable|prettier-ignore|@ts-|@vitest-environment|@jest-environment))/;

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

export function isRelevantFile(filePath: string): boolean {
	const posix = filePath.replaceAll(path.sep, "/");
	return (
		/\.(ts|tsx)$/.test(posix) &&
		path.basename(posix) !== "routeTree.gen.ts" &&
		!posix.includes("/apps/api/drizzle/")
	);
}

function isTestFile(filePath: string): boolean {
	return (
		/\.(test|spec|int-spec)\.tsx?$/.test(filePath) ||
		filePath.replaceAll(path.sep, "/").includes("/apps/e2e/")
	);
}

// Root "typescript" (7.x) is a native-compiler stub with no parser API; resolve apps/api's 5.x instead.
async function loadTypescript(cwd: string): Promise<TypeScript> {
	try {
		const resolved = Bun.resolveSync("typescript", path.join(cwd, "apps/api") + path.sep);
		return await import(resolved);
	} catch {
		return await import("typescript");
	}
}

function containsJsx(ts: TypeScript, node: Node): boolean {
	if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
		return true;
	}
	return ts.forEachChild(node, (child) => containsJsx(ts, child) || undefined) ?? false;
}

function isComponent(ts: TypeScript, node: Node): boolean {
	if (ts.isFunctionDeclaration(node)) {
		return PASCAL_CASE.test(node.name?.text ?? "") && containsJsx(ts, node);
	}
	if (ts.isVariableStatement(node)) {
		const [declaration] = node.declarationList.declarations;
		return (
			declaration !== undefined &&
			ts.isIdentifier(declaration.name) &&
			PASCAL_CASE.test(declaration.name.text) &&
			declaration.initializer !== undefined &&
			containsJsx(ts, declaration.initializer)
		);
	}
	return false;
}

function isPropsType(ts: TypeScript, node: Node): boolean {
	return (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text.endsWith("Props");
}

function isProp(ts: TypeScript, node: Node): boolean {
	if (!ts.isPropertySignature(node)) {
		return false;
	}
	for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
		if (isPropsType(ts, ancestor)) {
			return true;
		}
		if (ts.isFunctionLike(ancestor)) {
			const owner = ts.isFunctionDeclaration(ancestor) ? ancestor : ancestor.parent?.parent?.parent;
			return owner !== undefined && isComponent(ts, owner);
		}
		if (!ts.isTypeLiteralNode(ancestor) && !ts.isParameter(ancestor) && !ts.isIntersectionTypeNode(ancestor)) {
			return false;
		}
	}
	return false;
}

function isComponentOrProps(ts: TypeScript, node: Node): boolean {
	return isComponent(ts, node) || isPropsType(ts, node) || isProp(ts, node);
}

function extractComments(ts: TypeScript, text: string, filePath: string): Comment[] {
	const isTsx = filePath.endsWith(".tsx");
	const inTest = isTestFile(filePath);
	const sourceFile = ts.createSourceFile(
		isTsx ? "guard.tsx" : "guard.ts",
		text,
		ts.ScriptTarget.Latest,
		true,
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
			const line = sourceFile.getLineAndCharacterOfPosition(range.pos).line + 1;
			comments.push({ text: comment, line, ban });
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
	collectAt(sourceFile.endOfFileToken.getFullStart(), null);

	return comments;
}

export async function addedComments(
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

export function git(cwd: string, args: string[]): string | null {
	const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
	return result.status === 0 ? result.stdout : null;
}

export function repoRoot(cwd: string): string | null {
	return git(cwd, ["rev-parse", "--show-toplevel"])?.trim() ?? null;
}

// Union of HEAD and the index, so an already-staged comment isn't re-reported.
export function gitBaselines(cwd: string, filePath: string): string[] {
	const root = repoRoot(cwd);
	if (!root) {
		return [];
	}
	const relative = path.relative(root, filePath).replaceAll(path.sep, "/");
	return [git(root, ["show", `HEAD:${relative}`]), git(root, ["show", `:${relative}`])].filter(
		(t): t is string => t !== null,
	);
}
