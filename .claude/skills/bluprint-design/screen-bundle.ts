import { createHash } from "node:crypto";
import {
	access,
	copyFile,
	cp,
	mkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

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
export const versionFolderPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\/v[1-9][0-9]*$/;
const pagePathPattern = /^(?:[a-z0-9][a-z0-9.-]*\/)*[a-z0-9][a-z0-9.-]*\.html$/;
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

export function inlineScript(js: string) {
	if (/<\/script|<!--/i.test(js))
		throw new Error("An inlined script contains </script or <!--");
	return `<script>\n${js}\n</script>`;
}

export function assemblePage(body: string, css: string, scripts: string[]) {
	if (!body.includes("<head>")) throw new Error("Prototype must have <head>");
	return body.replace(
		"<head>",
		`<head>\n<style>${css}</style>\n${scripts.map(inlineScript).join("\n")}\n`,
	);
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

function pruneToStates(value: unknown, ids: Set<string>, path: string): Pruned {
	if (isRow(value)) return { value, found: ids.has(value.id), hasRows: true };
	if (Array.isArray(value)) {
		const items = value.map((item, index) =>
			pruneToStates(item, ids, `${path}[${index}]`),
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
			([key, item]) =>
				[key, pruneToStates(item, ids, `${path}.${key}`)] as const,
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

const galleryCss =
	"html,body{background:var(--secondary)!important}#dc-root>.sc-host>div{width:auto!important;padding:16px!important;gap:48px!important}#dc-root>.sc-host>div,#dc-root>.sc-host>div *:has([data-screen-label]),[data-screen-label]{grid-template-columns:minmax(0,1fr);min-width:0}[data-screen-label]{scroll-margin-top:16px}[data-screen-label]>div{flex-wrap:wrap;max-width:100%}";

const galleryIndex =
	'<nav aria-label="Estados" style="display:flex; flex-wrap:wrap; gap:8px 16px; padding:16px; background:var(--secondary); font-family:var(--font-sans); font-size:var(--text-sm)"><sc-for list="{{ qaIndex }}" as="state"><a href="#{{ state.id }}" onClick="{{ jump }}">{{ state.id }} {{ state.title }}</a></sc-for></nav>';

const galleryLogic = (
	values: unknown,
	index: { id: string; title: string }[],
) => `
const VALUES = ${JSON.stringify(values, null, 2)};
const INDEX = ${JSON.stringify(index, null, 2)};
const IDS = new Set(INDEX.map((state) => state.id));
class Component extends DCLogic {
  state = { mounted: [] };
  observed = new Set();
  componentDidMount() {
    this.observer = new IntersectionObserver((entries) => {
      const near = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.getAttribute("data-screen-label"));
      if (near.length) this.setState((state) => ({ mounted: [...new Set([...state.mounted, ...near])] }));
    }, { rootMargin: "1200px 0px" });
    this.observeRows();
  }
  componentDidUpdate() { this.observeRows(); }
  componentWillUnmount() { this.observer.disconnect(); }
  observeRows() {
    for (const row of document.querySelectorAll("[data-screen-label]")) {
      if (this.observed.has(row)) continue;
      this.observed.add(row);
      this.observer.observe(row);
    }
  }
  jump = (event) => {
    event.preventDefault();
    document.getElementById(event.currentTarget.getAttribute("href").slice(1))?.scrollIntoView({ block: "start" });
  };
  renderVals() {
    const mounted = new Set(this.state.mounted);
    const reveal = (value) => {
      if (Array.isArray(value)) return value.map(reveal);
      if (!value || typeof value !== "object") return value;
      if (typeof value.id === "string" && IDS.has(value.id)) {
        const shown = mounted.has(value.id);
        return { ...value, ...("shown" in value && { shown }), ...("placeholder" in value && { placeholder: !shown }) };
      }
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reveal(item)]));
    };
    return { ...reveal(VALUES), qaIndex: INDEX, jump: this.jump };
  }
}
`;

export type GallerySpec = { file: string; states: string[] };

export function selectStates(available: string[], patterns: string[]) {
	const selected = new Set<string>();
	for (const pattern of patterns) {
		const matches =
			pattern === "*"
				? available
				: pattern.endsWith("*")
					? available.filter(
							(id) =>
								id.startsWith(pattern.slice(0, -1)) &&
								/^[0-9]/.test(id.slice(pattern.length - 1)),
						)
					: available.filter((id) => id === pattern);
		if (!matches.length) throw new Error(`No QA state matches ${pattern}`);
		for (const id of matches) selected.add(id);
	}
	return available.filter((id) => selected.has(id));
}

export function galleryPage(file: string, body: string, patterns: string[]) {
	const rowAttribute = /data-screen-label="\{\{\s*(\w+)\.id\s*\}\}"/;
	const variable = rowAttribute.exec(body)?.[1];
	if (!variable)
		throw new Error(
			`${file}: QA rows need data-screen-label="{{ row.id }}" (SKILL.md)`,
		);
	const values = qaValues(file, body);
	const rows = collectRows(values);
	if (!rows.length) throw new Error(`${file}: renderVals() returned no states`);
	const ids = rows.map((row) => row.id);
	const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
	if (duplicate) throw new Error(`${file}: duplicate state ${duplicate}`);
	const selected = new Set(selectStates(ids, patterns));
	const index = rows
		.filter((row) => selected.has(row.id))
		.map(({ id, title }) => ({ id, title }));
	const pruned = pruneToStates(values, selected, "renderVals()").value;
	const withIndex = body
		.replace(
			new RegExp(rowAttribute.source, "g"),
			(attribute) => `${attribute} id="{{ ${variable}.id }}"`,
		)
		.replace(
			/<\/helmet>|<x-dc(?:\s[^>]*)?>(?![\s\S]*<\/helmet>)/,
			(tag) => `${tag}\n${galleryIndex}`,
		);
	return {
		states: index.map((state) => state.id),
		body: withIndex.replace(
			logicPattern,
			(_, opening: string, __: string, closing: string) =>
				opening + galleryLogic(pruned, index) + closing,
		),
	};
}

export function pageName(prototype: string) {
	return `${prototype
		.slice(0, -".dc.html".length)
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")}.html`;
}

function escapeHtml(text: string) {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll('"', "&quot;");
}

function listPage(title: string, intro: string, items: string[]) {
	return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:24px 16px;line-height:1.5;color:#0b1b33}a{color:#0a5bd8}li{margin:4px 0}span{color:#5b6b80;font-size:.9em}@media (prefers-color-scheme:dark){body{background:#081830;color:#e6edf7}a{color:#7fb2ff}span{color:#9fb0c6}}</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${intro}
<ul>
${items.join("\n")}
</ul>
</body>
</html>
`;
}

function listItem(href: string, label: string, note = "") {
	return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a>${note ? ` <span>${escapeHtml(note)}</span>` : ""}</li>`;
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

export type Page = { file: string; states: string[] };

export async function buildBundle(
	source: string,
	out: string,
	galleries: GallerySpec[] = [{ file: "qa.html", states: ["*"] }],
): Promise<Page[]> {
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
	const isQa = (file: string, body: string) =>
		body.includes("data-screen-label=") || / QA\.dc\.html$/.test(file);
	const screens = [...sources].filter(([file, body]) => !isQa(file, body));
	const qa = [...sources].filter(([file, body]) => isQa(file, body));
	if (qa.length > 1)
		throw new Error("Screen directory must hold at most one QA prototype");
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
		`window.__resources={};window.__resourceBlobs=Object.fromEntries(Object.entries(${JSON.stringify(resources).replaceAll("<", "\\u003c")}).map(([key,body])=>[key,new Blob([body],{type:"text/html"})]));`,
		await readFile(join(skill, "support.js"), "utf8"),
	];
	const pages: Page[] = [];
	const add = async (file: string, body: string, states: string[] = []) => {
		if (!pagePathPattern.test(file))
			throw new Error(`Use a lowercase relative .html path: ${file}`);
		if (pages.some((page) => page.file === file))
			throw new Error(`Duplicate page: ${file}`);
		await mkdir(dirname(join(out, file)), { recursive: true });
		await writeFile(
			join(out, file),
			assemblePage(
				encodeRootTemplate(body),
				css + (states.length ? galleryCss : ""),
				scripts,
			),
		);
		pages.push({ file, states });
	};
	for (const [file, body] of screens) await add(pageName(file), body);
	const [qaPrototype] = qa;
	if (qaPrototype)
		for (const gallery of galleries) {
			const page = galleryPage(qaPrototype[0], qaPrototype[1], gallery.states);
			await add(gallery.file, page.body, page.states);
		}
	const kept = files.filter(
		(file) => file.endsWith(".dc.html") || file.endsWith(".md"),
	);
	const docs = files.filter((file) => file.endsWith(".md"));
	await mkdir(join(out, "source"));
	for (const file of kept)
		await copyFile(join(source, file), join(out, "source", file));
	for (const file of docs) await copyFile(join(source, file), join(out, file));
	const [screen] = screens;
	await writeFile(
		join(out, "index.html"),
		listPage(
			screen ? screen[0].slice(0, -".dc.html".length) : "Protótipo",
			"<p>Versão imutável: uma mudança vira uma nova pasta de versão. Cada página abre sozinha, sem rede.</p>",
			[
				...pages.map((page) =>
					listItem(page.file, page.file, page.states.join(", ")),
				),
				...docs.map((file) => listItem(file, file)),
				listItem("source/", "source/", "arquivos da sessão de refinamento"),
			],
		),
	);
	await writeFile(
		join(out, "source", "index.html"),
		listPage(
			"Fontes",
			"<p>Arquivos como saíram da sessão de refinamento.</p>",
			kept.map((file) => listItem(encodeURIComponent(file), file)),
		),
	);
	return pages;
}

async function git(clone: string, args: string[]) {
	const child = Bun.spawn(["git", "-C", clone, ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code !== 0) throw new Error(`git ${args[0]} failed: ${stderr || stdout}`);
	return stdout.trim();
}

async function exists(path: string) {
	return access(path).then(
		() => true,
		() => false,
	);
}

export async function stageVersion(
	bundle: string,
	clone: string,
	folder: string,
) {
	if (!versionFolderPattern.test(folder))
		throw new Error("Use <screen>/v<n>, such as nova-obra/v2");
	if ((await git(clone, ["branch", "--show-current"])) !== "main")
		throw new Error("The prototypes clone must be on main");
	if (await git(clone, ["status", "--porcelain"]))
		throw new Error("The prototypes clone has uncommitted changes");
	const target = join(clone, folder);
	if (await exists(target))
		throw new Error(`${folder} exists; versions are immutable`);
	await cp(bundle, target, { recursive: true });
	const [screen] = folder.split("/");
	if (!screen) throw new Error("Missing screen folder");
	const versions = (await readdir(join(clone, screen), { withFileTypes: true }))
		.filter((entry) => entry.isDirectory() && /^v[0-9]+$/.test(entry.name))
		.map((entry) => entry.name)
		.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
	await writeFile(
		join(clone, screen, "index.html"),
		listPage(
			screen,
			"",
			versions.map((version) => listItem(`${version}/`, version)),
		),
	);
	const screens = (await readdir(clone, { withFileTypes: true }))
		.filter(
			(entry) =>
				entry.isDirectory() && versionFolderPattern.test(`${entry.name}/v1`),
		)
		.map((entry) => entry.name)
		.sort();
	await writeFile(
		join(clone, "index.html"),
		listPage(
			"BluPrint · protótipos",
			"<p>Protótipos de tela aprovados, em pastas versionadas e imutáveis.</p>",
			screens.map((name) => listItem(`${name}/`, name)),
		),
	);
	await writeFile(join(clone, ".nojekyll"), "");
	await git(clone, ["add", "--all"]);
	await git(clone, [
		"commit",
		"--quiet",
		"-m",
		`feat: add ${folder} prototypes`,
	]);
	return git(clone, ["rev-parse", "HEAD"]);
}
