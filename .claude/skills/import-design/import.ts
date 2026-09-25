#!/usr/bin/env bun
// Imports a Claude Design export zip: the design system into the bluprint-design skill, or a screen handoff into docs/design/screens/.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const designSystemDir = path.join(repoRoot, ".claude/skills/bluprint-design");
const screensDir = path.join(repoRoot, "docs/design/screens");

function fail(message: string): never {
	console.error(`error: ${message}`);
	process.exit(1);
}

function newestDownloadedZip(): string {
	const downloads = path.join(homedir(), "Downloads");
	const zips = readdirSync(downloads)
		.filter((name) => name.endsWith(".zip"))
		.map((name) => path.join(downloads, name))
		.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
	return zips[0] ?? fail(`no .zip in ${downloads}`);
}

function listFiles(dir: string, prefix = ""): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const relative = path.join(prefix, entry.name);
		return entry.isDirectory() ? listFiles(path.join(dir, entry.name), relative) : [relative];
	});
}

// Empties the directory in place: deleting and recreating it once left a stray empty "<name> 2" folder on macOS.
function replaceContents(target: string, source: string): void {
	for (const entry of readdirSync(target)) {
		rmSync(path.join(target, entry), { recursive: true, force: true });
	}
	cpSync(source, target, { recursive: true });
}

function removeJunk(dir: string): void {
	for (const file of listFiles(dir)) {
		if (path.basename(file) === ".DS_Store") {
			rmSync(path.join(dir, file));
		}
	}
}

function importDesignSystem(root: string): void {
	const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
	if (!/^name:\s*bluprint-design\s*$/m.test(skill)) {
		fail("the zip's SKILL.md is not the bluprint-design skill");
	}
	const before = new Set(listFiles(designSystemDir));
	replaceContents(designSystemDir, root);
	removeJunk(designSystemDir);
	const after = new Set(listFiles(designSystemDir));
	console.log("kind: design-system");
	console.log(`added: ${[...after].filter((f) => !before.has(f)).join(", ") || "none"}`);
	console.log(`removed: ${[...before].filter((f) => !after.has(f)).join(", ") || "none"}`);
}

function importScreens(handoff: string): void {
	const bundled = path.join(handoff, "_ds");
	for (const id of existsSync(bundled) ? readdirSync(bundled) : []) {
		const differing = listFiles(path.join(bundled, id)).filter((file) => {
			const ours = path.join(designSystemDir, file);
			return !existsSync(ours) || !readFileSync(ours).equals(readFileSync(path.join(bundled, id, file)));
		});
		if (differing.length > 0) {
			fail(`the handoff was designed on a design system that differs from the repo's (${differing.join(", ")}); import that design system export first`);
		}
	}

	const imported: string[] = [];
	const handoffScreens = path.join(handoff, "screens");
	for (const screen of readdirSync(handoffScreens)) {
		const target = path.join(screensDir, screen);
		rmSync(target, { recursive: true, force: true });
		cpSync(path.join(handoffScreens, screen), target, { recursive: true });
		removeJunk(target);
		for (const file of listFiles(target).filter((f) => f.endsWith(".html"))) {
			const htmlPath = path.join(target, file);
			const html = readFileSync(htmlPath, "utf8");
			writeFileSync(htmlPath, html.replace(/(?:\.\.\/)+_ds\/[^/"']+\//g, "../../../../.claude/skills/bluprint-design/"));
		}
		imported.push(screen);
	}

	// The handoff README specs the screen the export is named after (design_handoff_<screen>).
	const lead = path.basename(handoff).replace(/^design_handoff_/, "");
	const readme = path.join(handoff, "README.md");
	if (existsSync(readme) && imported.includes(lead)) {
		cpSync(readme, path.join(screensDir, lead, "README.md"));
	}

	console.log("kind: screens");
	console.log(`screens: ${imported.join(", ")}`);
	console.log(`spec: ${imported.includes(lead) ? `docs/design/screens/${lead}/README.md` : "none"}`);
}

const zip = process.argv[2] ?? newestDownloadedZip();
const extracted = mkdtempSync(path.join(tmpdir(), "import-design-"));
const unzip = spawnSync("unzip", ["-q", zip, "-d", extracted], { stdio: "inherit" });
if (unzip.status !== 0) {
	fail(`could not unzip ${zip}`);
}
rmSync(path.join(extracted, "__MACOSX"), { recursive: true, force: true });
console.log(`zip: ${zip}`);

const top = readdirSync(extracted);
const handoff = top.find((name) => name.startsWith("design_handoff_"));
if (existsSync(path.join(extracted, "SKILL.md"))) {
	importDesignSystem(extracted);
} else if (handoff && existsSync(path.join(extracted, handoff, "screens"))) {
	importScreens(path.join(extracted, handoff));
} else {
	fail(`not a Claude Design export (top level: ${top.join(", ")})`);
}
rmSync(extracted, { recursive: true, force: true });
