#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const skill = import.meta.dir;
const repo = resolve(skill, "../../..");
const runtimeAssets = [
	[
		"https://unpkg.com/react@18.3.1/umd/react.production.min.js",
		"DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z",
	],
	[
		"https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
		"gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1",
	],
	[
		"https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
		"m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y",
	],
] satisfies [string, string][];

const artifactSchema = z.object({
	file: z
		.string()
		.refine((file) => basename(file) === file && ![".", ".."].includes(file)),
	sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.object({ artifacts: z.array(artifactSchema).min(1) });
const publishedSchema = z.array(
	z.object({
		name: z.string(),
		number: z.number().int().positive(),
		url: z.url(),
	}),
);
const captureSchema = z.object({
	styles: z.string(),
	rows: z
		.array(
			z.object({
				id: z.string().regex(/^[A-Za-z]+[0-9][A-Za-z0-9]*$/),
				html: z.string(),
			}),
		)
		.min(1),
});
type Artifact = z.infer<typeof artifactSchema>;
type Manifest = z.infer<typeof manifestSchema>;

function digest(content: Uint8Array | string) {
	return createHash("sha256").update(content).digest("hex");
}

async function command(args: string[], stdin?: string, env = process.env) {
	const child = Bun.spawn(args, {
		stdin: stdin === undefined ? "ignore" : new Blob([stdin]),
		stdout: "pipe",
		stderr: "pipe",
		env,
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

// GitHub's artifact round-trip rewrote literal JS Unicode escapes in the 2026-10-29 spike (ADR 0076).
function inlineScript(code: string) {
	return `<script>new Function(new TextDecoder().decode(Uint8Array.from(atob("${Buffer.from(code).toString("base64")}"),c=>c.charCodeAt(0))))();</script>`;
}

function encodeLogic(body: string) {
	return body.replace(
		/(<script\b[^>]*\bdata-dc-script\b[^>]*>)([\s\S]*?)(<\/script>)/g,
		(_, opening: string, logic: string, closing: string) =>
			`${opening.slice(0, -1)} data-encoded-logic="${Buffer.from(logic).toString("base64")}">${closing}`,
	);
}

async function stylesheet(file: string): Promise<string> {
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
			if (!["support.js", "_ds_bundle.js"].includes(basename(src)))
				throw new Error(`Unsupported script: ${src}`);
			return "";
		})
		.replace(
			/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g,
			(_, href: string) => {
				if (basename(href) !== "styles.css")
					throw new Error(`Unsupported stylesheet: ${href}`);
				return "";
			},
		)
		.replace(/(["'])([^"'\n]*\.dc\.html)\1/g, '"#"');
}

async function addArtifact(dir: string, file: string, body: string) {
	await writeFile(join(dir, file), body);
	return { file, sha256: digest(body) };
}

async function build(source: string) {
	const dir = await mkdtemp(join(tmpdir(), "bluprint-screen-"));
	const files = (await readdir(source)).sort();
	const prototypes = files.filter((file) => file.endsWith(".dc.html"));
	if (!prototypes.length)
		throw new Error("Screen directory must contain a .dc.html prototype");
	const scripts = await Promise.all(
		runtimeAssets.map(async ([url, hash]) => {
			const response = await fetch(url, {
				signal: AbortSignal.timeout(30_000),
				redirect: "error",
			});
			if (!response.ok) throw new Error(`${url}: ${response.status}`);
			const code = await response.text();
			if (createHash("sha384").update(code).digest("base64") !== hash)
				throw new Error(`Integrity mismatch: ${url}`);
			return inlineScript(code);
		}),
	);
	const sources = Object.fromEntries(
		await Promise.all(
			prototypes.map(async (file) => {
				const body = await readFile(join(source, file), "utf8");
				return [file, template(body)] satisfies [string, string];
			}),
		),
	);
	const resources = Object.fromEntries(
		Object.entries(sources).map(([file, body]) => [
			`./${encodeURIComponent(file.slice(0, -8))}.dc.html`,
			body,
		]),
	);
	const head =
		scripts.join("\n") +
		`<style>${await stylesheet(join(skill, "styles.css"))}</style>` +
		inlineScript(await readFile(join(skill, "_ds_bundle.js"), "utf8")) +
		inlineScript(
			`window.__resources={};window.__resourceBlobs=Object.fromEntries(Object.entries(${JSON.stringify(resources)}).map(([key,body])=>[key,new Blob([body],{type:"text/html"})]));document.addEventListener("DOMContentLoaded",()=>{for(const node of document.querySelectorAll("script[data-encoded-logic]"))node.textContent=new TextDecoder().decode(Uint8Array.from(atob(node.getAttribute("data-encoded-logic")),c=>c.charCodeAt(0)));});`,
		) +
		inlineScript(await readFile(join(skill, "support.js"), "utf8"));
	const artifacts: Artifact[] = [];
	for (const file of files.filter((file) => file.endsWith(".md")))
		artifacts.push(
			await addArtifact(dir, file, await readFile(join(source, file), "utf8")),
		);
	for (const [file, body] of Object.entries(sources))
		artifacts.push(
			await addArtifact(
				dir,
				file,
				encodeLogic(body).replace("<head>", `<head>\n${head}\n`),
			),
		);
	await writeFile(
		join(dir, "manifest.json"),
		JSON.stringify({ artifacts } satisfies Manifest, null, 2),
	);
	console.log(dir);
}

async function snapshot(dir: string, file: string) {
	if (basename(file) !== file || !file.endsWith(".dc.html"))
		throw new Error("Use a built prototype filename");
	const session = `bluprint-snapshot-${process.pid}`;
	const env = { ...process.env, CHROME_DEVTOOLS_AXI_SESSION: session };
	const url = pathToFileURL(join(dir, file)).href;
	const browserScript = `
await page.open(${JSON.stringify(url)});
await page.eval(()=>{const style=document.createElement('style');style.textContent='*{content-visibility:visible!important;contain-intrinsic-size:none!important}';document.head.appendChild(style)});
let ready=false;
for(let n=0;n<90;n++) {
  await page.wait(500);
  ready=await page.eval(()=>{
    const rows=[...document.querySelectorAll('[data-qa-row],[data-screen-label]')];
    return rows.length>0&&!document.querySelector('.sc-placeholder')&&!/Carregando [A-Z]+[0-9][A-Za-z0-9]*…/.test(document.body.textContent.replaceAll(/\\s+/g,' '))&&rows.every(row=>{
      const frames=[...row.querySelectorAll('div')].filter(e=>e.style.width==='390px'||e.style.width==='1280px');
      return frames.length>=2&&frames.every(frame=>frame.querySelector('.sc-host'));
    });
  });
  if(ready)break;
}
if(!ready)throw new Error('QA states did not finish rendering');
await page.eval(()=>document.fonts.ready.then(()=>true));
await page.wait(500);
console.log(JSON.stringify(await page.eval(()=>{
  if(window.BluPrintDesignSystem_d4fa62.__errors.length)throw new Error('Design system errors');
  const styles=[...document.styleSheets].map(s=>'<style>'+[...s.cssRules].map(r=>r.cssText).join('')+'</style>').join('');
  const rows=[...document.querySelectorAll('[data-qa-row],[data-screen-label]')].map(original=>{
    if(/Carregando [A-Z]+[0-9][A-Za-z0-9]*…/.test(original.textContent.replaceAll(/\\s+/g,' ')))throw new Error('Unrendered QA row');
    const row=original.cloneNode(true);
    row.querySelectorAll('script,iframe,object,embed').forEach(e=>e.remove());
    row.querySelectorAll('*').forEach(e=>{
      for(const a of [...e.attributes])if(/^on/i.test(a.name)||a.name==='data-dc-tpl')e.removeAttribute(a.name);
      if(e.style.display==='flex'&&e.style.gap==='32px'){e.style.display='grid';e.style.gridTemplateColumns='minmax(0,1fr)'}
      if(e.style.width==='390px'||e.style.width==='1280px'){e.parentElement.style.overflowX='auto';e.parentElement.style.maxWidth='100%'}
    });
    const originals=[...original.querySelectorAll('input,textarea')];
    row.querySelectorAll('input,textarea').forEach((e,i)=>{if(e.tagName==='TEXTAREA')e.textContent=originals[i].value;else{e.setAttribute('value',originals[i].value);if(originals[i].checked)e.setAttribute('checked','')}});
    const id=row.getAttribute('data-qa-row')||row.getAttribute('data-screen-label');
    if(!/^[A-Za-z]+[0-9][A-Za-z0-9]*$/.test(id))throw new Error('Invalid snapshot state '+id);
    row.id=id;
    return {id,html:row.outerHTML};
  });
  return {styles,rows};
})));
`;
	let captured: z.infer<typeof captureSchema>;
	try {
		captured = captureSchema.parse(
			JSON.parse(
				await command(["chrome-devtools-axi", "run"], browserScript, env),
			),
		);
	} finally {
		await command(["chrome-devtools-axi", "stop"], undefined, env);
	}
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")),
	);
	const groups = Map.groupBy(
		captured.rows,
		(row) => row.id.match(/^[A-Za-z]+/)?.[0] ?? "states",
	);
	for (const [group, rows] of groups) {
		const name = `${file.slice(0, -8)}-${group}-static.html`;
		const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${group} - estados</title>${captured.styles}<style>html,body{margin:0;height:auto}body{padding:16px;background:var(--secondary);color:var(--foreground);font-family:var(--font-sans)}.snapshot-states{display:grid;gap:48px;min-width:0}.snapshot-index{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px}*,*::before,*::after{animation-play-state:paused!important;transition:none!important}</style></head><body><nav class="snapshot-index" aria-label="Estados">${rows.map((row) => `<a href="#${row.id}">${row.id}</a>`).join(" ")}</nav><main class="snapshot-states">${rows.map((row) => row.html).join("\n")}</main></body></html>`;
		const artifact = await addArtifact(dir, name, html);
		manifest.artifacts = manifest.artifacts
			.filter((entry) => entry.file !== name)
			.concat(artifact);
		console.log(`${name}: ${rows.map((row) => row.id).join(", ")}`);
	}
	await writeFile(
		join(dir, "manifest.json"),
		JSON.stringify(manifest, null, 2),
	);
}

async function publish(issue: string, dir: string) {
	if (
		!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/.test(issue)
	)
		throw new Error("Use a full GitHub issue URL");
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")),
	);
	for (const artifact of manifest.artifacts) {
		if (basename(artifact.file) !== artifact.file)
			throw new Error("Invalid artifact filename");
		const body = await readFile(join(dir, artifact.file));
		if (digest(body) !== artifact.sha256)
			throw new Error(`Changed after build: ${artifact.file}`);
		if (/\\u|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(body.toString("utf8")))
			throw new Error(
				`GitHub rewrites Unicode escapes/control characters; encode before publishing: ${artifact.file}`,
			);
	}
	const verification = await mkdtemp(
		join(tmpdir(), "bluprint-artifact-download-"),
	);
	const list = () =>
		command([
			"gh",
			"issue",
			"artifact",
			"list",
			issue,
			"--json",
			"name,number,url",
		]);
	let existing = publishedSchema.parse(JSON.parse(await list()));
	for (const artifact of manifest.artifacts) {
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
		existing = publishedSchema.parse(JSON.parse(await list()));
		const published = existing.find((entry) => entry.name === artifact.file);
		if (!published)
			throw new Error(`Missing published artifact: ${artifact.file}`);
		const downloaded = join(verification, artifact.file);
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
		console.log(`${published.url}\t${artifact.sha256}\t${artifact.file}`);
	}
}

const [operation, first, second] = Bun.argv.slice(2);
if (operation === "build" && first && !second) await build(resolve(first));
else if (operation === "snapshot" && first && second)
	await snapshot(resolve(first), second);
else if (operation === "publish" && first && second)
	await publish(first, resolve(second));
else
	throw new Error(
		"Usage: bun screen-artifacts.ts build <trusted-screen-dir> | snapshot <temp-bundle-dir> <QA.dc.html> | publish <issue-url> <temp-bundle-dir>",
	);
