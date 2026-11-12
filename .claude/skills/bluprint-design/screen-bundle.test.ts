import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import {
	assemblePreview,
	buildBundle,
	encodeTemplateCase,
	escapeControlEscapes,
	evaluatesCode,
	patchRuntime,
	galleryPage,
	selectStates,
	transportProblem,
} from "./screen-bundle";

const repo = resolve(import.meta.dir, "../../..");
const observedPreviewCsp =
	"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; media-src 'none'; child-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; manifest-src 'none'; base-uri 'none'";

const demo = `<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="styles.css">
<meta charset="utf-8">
</head>
<body>
<x-dc>
<div>
  <form onSubmit="{{ onSubmit }}">
    <input id="name" value="{{ name }}" onChange="{{ onName }}">
    <button type="submit">Salvar</button>
  </form>
  <p id="result">{{ result }}</p>
  <p id="note">{{ note }}</p>
  <x-import component-from-global-scope="BluPrintDesignSystem_d4fa62.Input" id="ds" value="{{ ds }}" onChange="{{ onDs }}" hint-size="200px,44px"/>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {
  state = { name: "", ds: "", result: "" };
  onName = (e) => this.setState({ name: e.target.value });
  onDs = (e) => this.setState({ ds: e.target.value });
  onSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("saved", this.state.name);
    this.setState({ result: "Salvo: " + localStorage.getItem("saved") });
  };
  renderVals() {
    return { ...this.state, note: this.props.note || "", onName: this.onName, onDs: this.onDs, onSubmit: this.onSubmit };
  }
}
</script>
</body>
</html>
`;

const demoQa = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<x-dc>
<div>
  <h1 id="gallery-title">Demo QA</h1>
  <sc-for list="{{ groups }}" as="g">
    <section>
      <h2>{{ g.title }}</h2>
      <sc-for list="{{ g.rows }}" as="row">
        <div data-screen-label="{{ row.id }}">
          <span class="state-title">{{ row.title }}</span>
          <sc-if value="{{ row.shown }}">
            <div><dc-import name="Demo" note="{{ row.note }}" hint-size="300px,200px"></dc-import></div>
          </sc-if>
        </div>
      </sc-for>
    </section>
  </sc-for>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
const GROUPS = [["Um", [["D1", "Primeiro", "um"]]], ["Dois", [["D2", "Segundo · fim", "dois"]]]];
class Component extends DCLogic {
  state = { seen: 0 };
  renderVals() {
    return {
      groups: GROUPS.map(([title, rows]) => ({
        title,
        rows: rows.map(([id, t, note], index) => ({ id, title: t, note, shown: index < this.state.seen, placeholder: index >= this.state.seen })),
      })),
    };
  }
}
</script>
</body>
</html>
`;

describe("encodeTemplateCase", () => {
	test("encodes camelCase attributes the way dc-runtime decodes them", () => {
		expect(
			encodeTemplateCase('<input onChange="{{ a }}" autoComplete="off">'),
		).toBe('<input sc-camel-on-change="{{ a }}" sc-camel-auto-complete="off">');
	});

	test("expands self-closing imports and wraps parser-sensitive tags", () => {
		expect(
			encodeTemplateCase(
				'<helmet></helmet><x-import name="a"/><select><option>1</option></select>',
			),
		).toBe(
			'<sc-helmet></sc-helmet><x-import name="a"></x-import><sc-raw-select><option>1</option></sc-raw-select>',
		);
	});

	test("is idempotent, because the runtime encodes the template again", () => {
		const once = encodeTemplateCase(demo);
		expect(encodeTemplateCase(once)).toBe(once);
	});
});

describe("escapeControlEscapes", () => {
	test("rewrites control-character escapes to equivalent hex escapes", () => {
		const source = String.raw`["a\u0000b", "\u001b", /\u0080/.test(String.fromCharCode(128)), "\u{7f}", "\u00e9"]`;
		const escaped = escapeControlEscapes(source);
		expect(transportProblem(escaped)).toBeNull();
		expect(escaped).toContain("\\u00e9");
		expect(runInNewContext(escaped)).toEqual(runInNewContext(source));
	});

	test("leaves escaped backslashes alone", () => {
		const source = String.raw`"\\u0000"`;
		expect(escapeControlEscapes(source)).toBe(source);
	});
});

describe("patchRuntime", () => {
	test("removes every Function constructor from support.js", async () => {
		const runtime = await readFile(join(import.meta.dir, "support.js"), "utf8");
		expect(evaluatesCode(runtime)).toBe(true);
		const patched = patchRuntime(runtime);
		expect(evaluatesCode(patched)).toBe(false);
		expect(patched.match(/__bluprintCompile\(/g)).toHaveLength(2);
	});

	test("fails loudly when the runtime no longer matches", () => {
		expect(() => patchRuntime("const fn = 1;")).toThrow("support.js changed");
	});
});

describe("selectStates", () => {
	test("keeps QA order and expands letter prefixes", () => {
		expect(
			selectStates(["W1", "W1b", "WX1", "A1", "W10"], ["A1", "W*"]),
		).toEqual(["W1", "W1b", "A1", "W10"]);
	});

	test("rejects a pattern that matches nothing", () => {
		expect(() => selectStates(["W1"], ["C*"])).toThrow("C*");
	});
});

describe("galleryPage", () => {
	test("keeps only the chosen states and drops groups left empty", () => {
		const page = galleryPage("Demo QA.dc.html", demoQa, ["D2"]);
		expect(page.states).toEqual(["D2"]);
		const logic = page.body.split("data-dc-script>")[1] ?? "";
		expect(logic).toContain('"id": "D2"');
		expect(logic).not.toContain('"D1"');
		expect(logic).not.toContain('"title": "Um"');
		expect(page.body).toContain('id="{{ row.id }}"');
	});

	test("rejects a QA page without state rows", () => {
		expect(() => galleryPage("X QA.dc.html", demo, ["*"])).toThrow(
			"data-screen-label",
		);
	});
});

describe("assemblePreview", () => {
	test("refuses scripts that evaluate strings", () => {
		expect(() =>
			assemblePreview("<head></head><body></body>", "", ["eval('1')"]),
		).toThrow("eval");
	});
});

type Browser = {
	newPage: () => Promise<Page>;
	close: () => Promise<void>;
};
type Frame = {
	url: () => string;
	evaluate: <T>(fn: () => T) => Promise<T>;
	locator: (selector: string) => {
		pressSequentially: (text: string) => Promise<void>;
		press: (key: string) => Promise<void>;
		inputValue: () => Promise<string>;
		textContent: () => Promise<string | null>;
		count: () => Promise<number>;
		waitFor: (options?: { timeout: number }) => Promise<void>;
	};
};
type Page = {
	route: (
		url: string,
		handler: (route: {
			fulfill: (response: Record<string, unknown>) => Promise<void>;
		}) => Promise<void>,
	) => Promise<void>;
	goto: (url: string) => Promise<unknown>;
	frames: () => Frame[];
	waitForTimeout: (ms: number) => Promise<void>;
	close: () => Promise<void>;
};

let browser: Browser;

beforeAll(async () => {
	const { chromium } = createRequire(join(repo, "apps/e2e/package.json"))(
		"@playwright/test",
	);
	browser = await chromium.launch();
});

afterAll(() => browser.close());

async function openInPreviewSandbox(html: string) {
	const page = await browser.newPage();
	await page.route("https://preview.test/", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: '<iframe sandbox="allow-scripts" src="https://artifact.test/" style="width:1000px;height:900px"></iframe>',
		}),
	);
	await page.route("https://artifact.test/", (route) =>
		route.fulfill({
			contentType: "text/html; charset=utf-8",
			headers: { "content-security-policy": observedPreviewCsp },
			body: html,
		}),
	);
	await page.goto("https://preview.test/");
	const frame = () => {
		const found = page
			.frames()
			.find((candidate) => candidate.url() === "https://artifact.test/");
		if (!found) throw new Error("Preview frame missing");
		return found;
	};
	return { page, frame };
}

describe("Preview sandbox", () => {
	test("runs each script once, in order, and shows errors", async () => {
		const html = assemblePreview(
			"<!DOCTYPE html><html><head></head><body><p id='log'></p></body></html>",
			"",
			[
				"window.order = ['first'];",
				"window.order.push('second'); try { globalThis['Function']('return 1')(); window.order.push('eval allowed'); } catch { window.order.push('eval blocked'); }",
				"throw new Error('boom');",
				"window.order.push('after error'); document.getElementById('log').textContent = window.order.join(',');",
			],
		);
		const { page, frame } = await openInPreviewSandbox(html);
		await frame().locator("#log").waitFor();
		await page.waitForTimeout(300);
		expect(await frame().locator("#log").textContent()).toBe(
			"first,second,eval blocked,after error",
		);
		expect(
			await frame().evaluate(() => document.body.textContent?.includes("boom")),
		).toBe(true);
		expect(
			await frame().evaluate(
				() => document.querySelectorAll("textarea,img").length,
			),
		).toBe(0);
		await page.close();
	});

	describe("built screen", () => {
		let out: string;

		beforeAll(async () => {
			const source = await mkdtemp(join(tmpdir(), "bluprint-bundle-test-"));
			out = await mkdtemp(join(tmpdir(), "bluprint-bundle-test-out-"));
			await writeFile(join(source, "Demo.dc.html"), demo);
			await writeFile(join(source, "Demo QA.dc.html"), demoQa);
			await writeFile(join(source, "README.md"), "# Demo\n");
			await buildBundle(source, out, [
				{ name: "", states: ["*"] },
				{ name: "Dois · fim", states: ["D2"] },
			]);
		}, 60_000);

		test("publishes the screen and one gallery per chosen set of states", async () => {
			const manifest = JSON.parse(
				await readFile(join(out, "manifest.json"), "utf8"),
			);
			expect(
				manifest.artifacts.map((artifact: { file: string }) => artifact.file),
			).toEqual([
				"README.md",
				"Demo QA.dc.html",
				"Demo QA Dois - fim.dc.html",
				"Demo.dc.html",
			]);
		});

		test("types into camelCase handlers and submits on Enter", async () => {
			const { page, frame } = await openInPreviewSandbox(
				await readFile(join(out, "Demo.dc.html"), "utf8"),
			);
			await frame().locator("#name").waitFor({ timeout: 15_000 });
			await frame().locator("#name").pressSequentially("Casa");
			await frame().locator("#ds").pressSequentially("Moinhos");
			expect(await frame().locator("#name").inputValue()).toBe("Casa");
			expect(await frame().locator("#ds").inputValue()).toBe("Moinhos");
			await frame().locator("#name").press("Enter");
			await page.waitForTimeout(200);
			expect(await frame().locator("#result").textContent()).toBe(
				"Salvo: Casa",
			);
			expect(
				await frame().evaluate(
					() =>
						(
							window as unknown as {
								BluPrintDesignSystem_d4fa62: { __errors: unknown[] };
							}
						).BluPrintDesignSystem_d4fa62.__errors.length,
				),
			).toBe(0);
			await page.close();
		}, 30_000);

		test("renders only its states, with an index, through the sibling screen", async () => {
			const { page, frame } = await openInPreviewSandbox(
				await readFile(join(out, "Demo QA Dois - fim.dc.html"), "utf8"),
			);
			await frame().locator("#note").waitFor({ timeout: 15_000 });
			expect(await frame().locator("#note").textContent()).toBe("dois");
			expect(await frame().locator("[data-screen-label]").count()).toBe(1);
			expect(await frame().locator("#D2").count()).toBe(1);
			expect(await frame().locator('nav a[href="#D2"]').textContent()).toBe(
				"D2 Segundo · fim",
			);
			await page.close();
		}, 30_000);

		test("mounts every state of a gallery", async () => {
			const { page, frame } = await openInPreviewSandbox(
				await readFile(join(out, "Demo QA.dc.html"), "utf8"),
			);
			await frame().locator("#D2 #note").waitFor({ timeout: 15_000 });
			expect(await frame().locator("#D1 #note").textContent()).toBe("um");
			expect(await frame().locator("#D2 #note").textContent()).toBe("dois");
			await page.close();
		}, 30_000);
	});
});
