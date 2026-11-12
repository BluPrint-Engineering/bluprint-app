import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { z } from "zod";

const skill = import.meta.dir;
const repo = resolve(skill, "../../..");
const libraries = [
	[
		"https://unpkg.com/react@18.3.1/umd/react.production.min.js",
		"DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z",
	],
	[
		"https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
		"gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1",
	],
] satisfies [string, string][];

export const stateIdPattern = /^[A-Za-z]+[0-9][A-Za-z0-9]*$/;
export const artifactSchema = z.object({
	file: z
		.string()
		.refine((file) => !/[/\\]/.test(file) && ![".", ".."].includes(file)),
	sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const manifestSchema = z.object({
	artifacts: z.array(artifactSchema).min(1),
});
type Artifact = z.infer<typeof artifactSchema>;

const controlCharacter = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/;
const controlEscape =
	/\\u(?:00[01][0-9a-fA-F]|007[fF]|00[89][0-9a-fA-F]|\{0*(?:[01]?[0-9a-fA-F]|7[fF]|[89][0-9a-fA-F])\})/;

export function digest(content: Uint8Array | string) {
	return createHash("sha256").update(content).digest("hex");
}

export function transportProblem(body: string) {
	if (controlCharacter.test(body)) return "a raw control character";
	if (controlEscape.test(body))
		return "a Unicode escape of a control character";
	return null;
}

// GitHub's artifact round-trip rewrote \u escapes of control characters (\u0000 became \^@) in the 2026-11-12 Preview probe (ADR 0076).
export function escapeControlEscapes(js: string) {
	return js.replace(
		/(?<!\\)((?:\\\\)*)\\u(?:00([01][0-9a-fA-F]|7[fF]|[89][0-9a-fA-F])|\{0*([01]?[0-9a-fA-F]|7[fF]|[89][0-9a-fA-F])\})/g,
		(_, slashes: string, short?: string, braced?: string) =>
			`${slashes}\\x${(short ?? braced ?? "").padStart(2, "0")}`,
	);
}

const attributes = `(?:[^>"']|"[^"]*"|'[^']*')*`;
const rawWrapped = [
	"select",
	"table",
	"tbody",
	"thead",
	"tfoot",
	"tr",
	"td",
	"th",
	"caption",
];

// Mirrors dc-runtime's encodeCase (support.js), which only runs on raw text; the root template is parsed as HTML first.
export function encodeTemplateCase(html: string) {
	let encoded = html
		.replace(
			new RegExp(`<(x-import|dc-import)(${attributes})/>`, "gi"),
			(_, tag: string, attrs: string) => `<${tag}${attrs}></${tag}>`,
		)
		.replace(/<helmet(\s|>)/gi, "<sc-helmet$1")
		.replace(/<\/helmet\s*>/gi, "</sc-helmet>")
		.replace(
			/(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g,
			(_, space: string, name: string, equals: string) =>
				`${space}sc-camel-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}${equals}`,
		);
	for (const tag of rawWrapped)
		encoded = encoded.replace(
			new RegExp(`(</?)${tag}(?=[\\s>])`, "gi"),
			`$1sc-raw-${tag}`,
		);
	return encoded;
}

function encodeRootTemplate(body: string) {
	const open = /<x-dc(?:\s[^>]*)?>/.exec(body);
	const close = body.lastIndexOf("</x-dc>");
	if (!open || close < open.index)
		throw new Error("Prototype must contain one <x-dc> template");
	const start = open.index + open[0].length;
	return (
		body.slice(0, start) +
		encodeTemplateCase(body.slice(start, close)) +
		body.slice(close)
	);
}

const logicPattern =
	/(<script\b[^>]*\bdata-dc-script\b[^>]*>)([\s\S]*?)(<\/script>)/;

function encodeLogic(body: string) {
	return body.replace(
		new RegExp(logicPattern, "g"),
		(_, opening: string, logic: string, closing: string) =>
			`${opening.slice(0, -1)} data-encoded-logic="${Buffer.from(logic).toString("base64")}">${closing}`,
	);
}

const runtimePatches = [
	[
		`const fn = new Function(
      "DCLogic",
      "StreamableLogic",
      "React",`,
		`const fn = __bluprintCompile(
      ["DCLogic", "StreamableLogic", "React"],`,
	],
	[
		`new Function("React", "module", "exports", "require", code)(`,
		`__bluprintCompile(["React", "module", "exports", "require"], code)(`,
	],
] as const;

export function patchRuntime(runtime: string) {
	let patched = runtime;
	for (const [from, to] of runtimePatches) {
		if (patched.split(from).length !== 2)
			throw new Error(
				"support.js changed: update runtimePatches in screen-bundle.ts",
			);
		patched = patched.replace(from, to);
	}
	return patched;
}

export function evaluatesCode(js: string) {
	return /(?<![\w$.])(?:new\s+Function\b|Function\s*\(|eval\s*\()/.test(js);
}

function escapeHtml(text: string) {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

const bootstrap = `if(window.__bluprintBooted)return;window.__bluprintBooted=true;const errors=[];const record=e=>errors.push(e.message);window.addEventListener('error',record);try{for(const source of document.querySelectorAll('textarea[data-preview-script]')){const script=document.createElement('script');script.textContent=source.value;document.head.appendChild(script);script.remove();source.remove()}}finally{window.removeEventListener('error',record)}this.remove();if(errors.length)document.body.insertAdjacentText('afterbegin','Preview error: '+errors.join('; '))`;

export function assemblePreview(body: string, css: string, scripts: string[]) {
	const sources = scripts.map((script) => {
		const js = escapeControlEscapes(script);
		if (evaluatesCode(js))
			throw new Error("Preview scripts must not use eval or new Function");
		return `<textarea hidden data-preview-script>\n${escapeHtml(js)}</textarea>`;
	});
	const tail = `${sources.join("\n")}\n<img alt="" width="1" height="1" style="position:absolute" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" onload="${bootstrap.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">\n`;
	const head = `<head>\n<style>${css}</style>\n<style>x-dc{display:none}</style>\n`;
	if (!body.includes("<head>")) throw new Error("Prototype must have <head>");
	const end = body.lastIndexOf("</body>");
	const html = (
		end === -1 ? body + tail : body.slice(0, end) + tail + body.slice(end)
	).replace("<head>", head);
	const problem = transportProblem(html);
	if (problem) throw new Error(`Preview document contains ${problem}`);
	return html;
}

export async function stylesheet(file: string): Promise<string> {
	let css = await readFile(file, "utf8");
	for (const match of css.matchAll(/@import\s+"([^"]+)";/g)) {
		const importPath = match[1];
		if (!importPath) throw new Error(`Malformed CSS import: ${file}`);
		css = css.replace(
			match[0],
			await stylesheet(resolve(file, "..", importPath)),
		);
	}
	for (const family of ["geist", "geist-mono"]) {
		const font = Bun.resolveSync(
			`@fontsource-variable/${family}/files/${family}-latin-wght-normal.woff2`,
			join(repo, "apps/web"),
		);
		const data = await readFile(font);
		css = css.replace(
			`https://cdn.jsdelivr.net/fontsource/fonts/${family}:vf@latest/latin-wght-normal.woff2`,
			`data:font/woff2;base64,${data.toString("base64")}`,
		);
	}
	if (/@import|https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, "")))
		throw new Error(`Unbundled CSS dependency: ${file}`);
	return css;
}

function template(source: string) {
	return source
		.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (_, src: string) => {
			if (!/(^|\/)(support|_ds_bundle)\.js$/.test(src))
				throw new Error(`Unsupported script: ${src}`);
			return "";
		})
		.replace(
			/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g,
			(_, href: string) => {
				if (!/(^|\/)styles\.css$/.test(href))
					throw new Error(`Unsupported stylesheet: ${href}`);
				return "";
			},
		)
		.replace(/(["'])([^"'\n]*\.dc\.html)\1/g, '"#"');
}

function checkOffline(file: string, body: string, siblings: Set<string>) {
	for (const [tag] of body.matchAll(
		new RegExp(`<x-import\\b${attributes}>`, "gi"),
	))
		if (
			/\s(from|src|import)\s*=/.test(tag) &&
			!/\scomponent-from-global-scope\s*=/.test(tag)
		)
			throw new Error(`${file}: x-import modules need the network: ${tag}`);
	for (const [, name] of body.matchAll(/<dc-import\b[^>]*\sname="([^"{]+)"/g))
		if (!siblings.has(`${name}.dc.html`))
			throw new Error(`${file}: missing sibling prototype ${name}.dc.html`);
	if (/\s(src|srcset|poster)\s*=\s*["']?(https?:)?\/\//i.test(body))
		throw new Error(`${file}: remote media need the network`);
}

type Row = Record<string, unknown> & { id: string; title: string };

function isRow(value: unknown): value is Row {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Row).id === "string" &&
		stateIdPattern.test((value as Row).id) &&
		typeof (value as Row).title === "string"
	);
}

function collectRows(value: unknown, rows: Row[] = []): Row[] {
	if (isRow(value)) rows.push(value);
	else if (Array.isArray(value))
		for (const item of value) collectRows(item, rows);
	else if (typeof value === "object" && value !== null)
		for (const item of Object.values(value)) collectRows(item, rows);
	return rows;
}

type Pruned = { value: unknown; found: boolean; hasRows: boolean };

function pruneToState(value: unknown, id: string, path: string): Pruned {
	if (isRow(value))
		return {
			value: {
				...value,
				...(value.shown === false && { shown: true }),
				...(value.placeholder === true && { placeholder: false }),
			},
			found: value.id === id,
			hasRows: true,
		};
	if (Array.isArray(value)) {
		const items = value.map((item, index) =>
			pruneToState(item, id, `${path}[${index}]`),
		);
		const kept = items.filter((item) => !item.hasRows || item.found);
		return {
			value: kept.map((item) => item.value),
			found: kept.some((item) => item.found),
			hasRows: items.some((item) => item.hasRows),
		};
	}
	if (typeof value === "object" && value !== null) {
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== null && Object.getPrototypeOf(prototype) !== null)
			throw new Error(`QA value ${path} is not plain data`);
		const entries = Object.entries(value).map(
			([key, item]) => [key, pruneToState(item, id, `${path}.${key}`)] as const,
		);
		return {
			value: Object.fromEntries(
				entries.map(([key, item]) => [key, item.value]),
			),
			found: entries.some(([, item]) => item.found),
			hasRows: entries.some(([, item]) => item.hasRows),
		};
	}
	if (
		value === null ||
		value === undefined ||
		["string", "number", "boolean"].includes(typeof value)
	)
		return { value, found: false, hasRows: false };
	throw new Error(`QA value ${path} is not plain data`);
}

function qaValues(file: string, body: string) {
	const logic = logicPattern.exec(body)?.[2];
	if (logic === undefined) throw new Error(`${file}: missing data-dc-script`);
	class DCLogic {
		props: Record<string, unknown> = {};
		state: Record<string, unknown> = {};
		setState() {}
		forceUpdate() {}
	}
	const React = createRequire(join(repo, "apps/web/package.json"))("react");
	const Component = runInNewContext(
		`${logic}\n;typeof Component === "undefined" ? undefined : Component`,
		{ DCLogic, React, console },
		{ filename: file },
	);
	if (typeof Component !== "function")
		throw new Error(`${file}: logic must define class Component`);
	return new Component().renderVals();
}

const statePageCss =
	"#dc-root :not([data-screen-label],[data-screen-label] *,:has([data-screen-label])){display:none!important}#dc-root :has([data-screen-label]){width:auto!important;padding:0!important;gap:0!important}html,body{background:var(--secondary)!important}#dc-root{padding:16px}[data-screen-label]>div{flex-wrap:wrap}";

export type StatePage = { id: string; title: string; body: string };

export function statePages(file: string, body: string): StatePage[] {
	if (!/data-screen-label="\{\{\s*\w+\.id\s*\}\}"/.test(body))
		throw new Error(
			`${file}: QA rows need data-screen-label="{{ row.id }}" (SKILL.md)`,
		);
	const values = qaValues(file, body);
	const rows = collectRows(values);
	if (!rows.length) throw new Error(`${file}: renderVals() returned no states`);
	const ids = rows.map((row) => row.id);
	const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
	if (duplicate) throw new Error(`${file}: duplicate state ${duplicate}`);
	return rows.map((row) => {
		const values_ = pruneToState(values, row.id, "renderVals()").value;
		const logic = `\nclass Component extends DCLogic {\n  renderVals() {\n    return ${JSON.stringify(values_, null, 2)};\n  }\n}\n`;
		return {
			id: row.id,
			title: row.title,
			body: body.replace(
				logicPattern,
				(_, opening: string, __: string, closing: string) =>
					opening + logic + closing,
			),
		};
	});
}

export function stateFileName(screen: string, page: StatePage) {
	const name = `${screen} ${page.id} ${page.title}`
		.replace(/[/\\]+/g, "-")
		.replace(/\s+/g, " ")
		.trim();
	return `${name}.dc.html`;
}

async function library(url: string, hash: string) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(30_000),
		redirect: "error",
	});
	if (!response.ok) throw new Error(`${url}: ${response.status}`);
	const code = await response.text();
	if (createHash("sha384").update(code).digest("base64") !== hash)
		throw new Error(`Integrity mismatch: ${url}`);
	return code;
}

export async function buildBundle(source: string, out: string) {
	const files = (await readdir(source)).sort();
	const prototypes = files.filter((file) => file.endsWith(".dc.html"));
	if (!prototypes.length)
		throw new Error("Screen directory must contain a .dc.html prototype");
	const sources = new Map(
		await Promise.all(
			prototypes.map(
				async (file) =>
					[file, template(await readFile(join(source, file), "utf8"))] as const,
			),
		),
	);
	const isQa = (body: string) => body.includes("data-screen-label=");
	const screens = [...sources].filter(
		([file, body]) => !isQa(body) && !/ QA\.dc\.html$/.test(file),
	);
	const siblings = new Set(screens.map(([file]) => file));
	for (const [file, body] of sources) checkOffline(file, body, siblings);
	const resources = Object.fromEntries(
		screens.map(([file, body]) => [
			`./${encodeURIComponent(file.slice(0, -".dc.html".length))}.dc.html`,
			body,
		]),
	);
	const css = await stylesheet(join(skill, "styles.css"));
	const scripts = [
		...(await Promise.all(libraries.map(([url, hash]) => library(url, hash)))),
		await readFile(join(skill, "_ds_bundle.js"), "utf8"),
		`window.__resources={};window.__resourceBlobs=Object.fromEntries(Object.entries(${JSON.stringify(resources)}).map(([key,body])=>[key,new Blob([body],{type:"text/html"})]));`,
		await readFile(join(skill, "preview-prelude.js"), "utf8"),
		patchRuntime(await readFile(join(skill, "support.js"), "utf8")),
	];
	const preview = (body: string, extraCss = "") =>
		assemblePreview(
			encodeLogic(encodeRootTemplate(body)),
			css + extraCss,
			scripts,
		);
	const artifacts: Artifact[] = [];
	const add = async (file: string, body: string) => {
		if (artifacts.some((artifact) => artifact.file === file))
			throw new Error(`Duplicate artifact name: ${file}`);
		await writeFile(join(out, file), body);
		artifacts.push({ file, sha256: digest(body) });
	};
	for (const file of files.filter((file) => file.endsWith(".md")))
		await add(file, await readFile(join(source, file), "utf8"));
	for (const [file, body] of sources) {
		if (siblings.has(file)) {
			await add(file, preview(body));
			continue;
		}
		const screen = file.slice(0, -".dc.html".length).replace(/ QA$/, "");
		for (const page of statePages(file, body))
			await add(stateFileName(screen, page), preview(page.body, statePageCss));
	}
	for (const artifact of artifacts) {
		const problem = transportProblem(
			await readFile(join(out, artifact.file), "utf8"),
		);
		if (problem) throw new Error(`${artifact.file} contains ${problem}`);
	}
	await writeFile(
		join(out, "manifest.json"),
		JSON.stringify({ artifacts }, null, 2),
	);
	return artifacts;
}
