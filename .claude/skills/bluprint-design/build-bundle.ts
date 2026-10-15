#!/usr/bin/env bun
// Rebuilds _ds_bundle.js and the component list of _ds_manifest.json from components/**/*.jsx. `--check` compares instead of writing.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = import.meta.dir;
const bundlePath = path.join(root, "_ds_bundle.js");
const manifestPath = path.join(root, "_ds_manifest.json");

const transpiler = new Bun.Transpiler({
	loader: "jsx",
	tsconfig: { compilerOptions: { jsx: "react", jsxFactory: "React.createElement", jsxFragmentFactory: "React.Fragment" } },
});

interface Source {
	sourcePath: string;
	code: string;
	imports: { names: string[]; from: string }[];
	exports: string[];
}

function listJsx(dir: string): string[] {
	return readdirSync(path.join(root, dir), { withFileTypes: true })
		.sort((a, b) => a.name.localeCompare(b.name))
		.flatMap((entry) => {
			const relative = `${dir}/${entry.name}`;
			if (entry.isDirectory()) {
				return listJsx(relative);
			}
			return entry.name.endsWith(".jsx") ? [relative] : [];
		});
}

function readSource(sourcePath: string): Source {
	let code = readFileSync(path.join(root, sourcePath), "utf8");
	const imports: Source["imports"] = [];
	code = code.replace(/^import\s+([^;]+?)\s+from\s+"([^"]+)";\n?/gm, (_, clause: string, from: string) => {
		if (from !== "react") {
			const names = [...clause.matchAll(/[\w$]+/g)].map((match) => match[0]);
			imports.push({ names, from: path.posix.join(path.posix.dirname(sourcePath), from) });
		}
		return "";
	});
	const exports: string[] = [];
	code = code.replace(/^export\s+((?:async\s+)?(?:function|const|let|class)\s+)([\w$]+)/gm, (_, keyword: string, name: string) => {
		exports.push(name);
		return `${keyword}${name}`;
	});
	if (/^export\s/m.test(code)) {
		throw new Error(`${sourcePath}: only "export function|const|let|class" is supported`);
	}
	return { sourcePath, code, imports, exports };
}

function dependencyOrder(sources: Source[]): Source[] {
	const ordered: Source[] = [];
	const visiting = new Set<string>();
	const visit = (source: Source) => {
		if (ordered.includes(source)) {
			return;
		}
		if (visiting.has(source.sourcePath)) {
			throw new Error(`import cycle through ${source.sourcePath}`);
		}
		visiting.add(source.sourcePath);
		for (const { from } of source.imports) {
			const dependency = sources.find((candidate) => candidate.sourcePath === from);
			if (!dependency) {
				throw new Error(`${source.sourcePath} imports ${from}, which is not a component`);
			}
			visit(dependency);
		}
		ordered.push(source);
	};
	sources.forEach(visit);
	return ordered;
}

function moduleBlock(source: Source): string {
	const bindings = source.imports.map(({ names }) => `const { ${names.join(", ")} } = __ds_scope;\n`).join("");
	const body = transpiler.transformSync(bindings + source.code).trim();
	return [
		`// ${source.sourcePath}`,
		"try { (() => {",
		body,
		`Object.assign(__ds_scope, { ${source.exports.join(", ")} });`,
		`})(); } catch (e) { __ds_ns.__errors.push({ path: ${JSON.stringify(source.sourcePath)}, error: String((e && e.message) || e) }); }`,
	].join("\n");
}

function build(namespace: string) {
	const sources = dependencyOrder(listJsx("components").map(readSource));
	const isComponent = (name: string) => /^[A-Z]/.test(name);
	const components = sources.flatMap((s) => s.exports.filter(isComponent).map((name) => ({ name, sourcePath: s.sourcePath })));
	const unexposedExports = sources.flatMap((s) => s.exports.filter((name) => !isComponent(name)).map((name) => ({ name, sourcePath: s.sourcePath })));
	const sourceHashes = Object.fromEntries(
		[...sources].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)).map((s) => [s.sourcePath, createHash("sha256").update(readFileSync(path.join(root, s.sourcePath))).digest("hex").slice(0, 12)]),
	);
	const header = { format: 4, namespace, components, sourceHashes, inlinedExternals: [], unexposedExports };
	const bundle = [
		`/* @ds-bundle: ${JSON.stringify(header)} */`,
		"(() => {",
		`const __ds_ns = (window.${namespace} = window.${namespace} || {});`,
		"const __ds_scope = {};",
		"(__ds_ns.__errors = __ds_ns.__errors || []);",
		...sources.map(moduleBlock),
		...components.map(({ name }) => `__ds_ns.${name} = __ds_scope.${name};`),
		"})();",
		"",
	].join("\n\n");
	return { bundle, components };
}

// Evaluating with no React in scope is what a standalone prototype does: the bundle loads before React.
function assertLoadsWithoutReact(bundle: string, namespace: string): void {
	const window: Record<string, { __errors: { path: string; error: string }[] }> = {};
	vm.runInNewContext(bundle, { window });
	const errors = window[namespace]?.__errors ?? [];
	if (errors.length > 0) {
		throw new Error(`modules touch React at load, make them lazy:\n${errors.map((e) => `  ${e.path}: ${e.error}`).join("\n")}`);
	}
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const { bundle, components } = build(manifest.namespace);
assertLoadsWithoutReact(bundle, manifest.namespace);
const nextManifest = `${JSON.stringify({ ...manifest, components })}\n`;

if (process.argv.includes("--check")) {
	const upToDate = readFileSync(bundlePath, "utf8") === bundle && readFileSync(manifestPath, "utf8") === nextManifest;
	if (!upToDate) {
		console.error("_ds_bundle.js or _ds_manifest.json is stale: run `bun .claude/skills/bluprint-design/build-bundle.ts`");
		process.exit(1);
	}
	console.log("bundle up to date");
} else {
	writeFileSync(bundlePath, bundle);
	writeFileSync(manifestPath, nextManifest);
	console.log(`${components.length} components -> _ds_bundle.js`);
}
