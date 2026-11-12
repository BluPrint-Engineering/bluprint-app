import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	buildBundle,
	encodeTemplateCase,
	galleryPage,
	inlineScript,
	pageName,
	selectStates,
	stageVersion,
} from "./screen-bundle";

const repo = resolve(import.meta.dir, "../../..");

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

describe("inlineScript", () => {
	test("refuses code that would end the script element early", () => {
		expect(() => inlineScript('const tag = "</script>";')).toThrow("</script");
	});
});

describe("pageName", () => {
	test("turns a prototype file into a lowercase page path", () => {
		expect(pageName("Nova obra.dc.html")).toBe("nova-obra.html");
		expect(pageName("Configuração.dc.html")).toBe("configuracao.html");
	});
});

type Browser = {
	newPage: () => Promise<Page>;
	close: () => Promise<void>;
};
type Locator = {
	pressSequentially: (text: string) => Promise<void>;
	press: (key: string) => Promise<void>;
	inputValue: () => Promise<string>;
	textContent: () => Promise<string | null>;
	count: () => Promise<number>;
	waitFor: (options?: { timeout: number }) => Promise<void>;
};
type Page = {
	goto: (url: string) => Promise<unknown>;
	locator: (selector: string) => Locator;
	evaluate: <T>(fn: () => T) => Promise<T>;
	on: (event: "pageerror", handler: (error: Error) => void) => void;
	waitForTimeout: (ms: number) => Promise<void>;
	close: () => Promise<void>;
};

async function git(cwd: string, ...args: string[]) {
	const child = Bun.spawn(["git", "-C", cwd, ...args], { stdout: "pipe" });
	await child.exited;
	return (await new Response(child.stdout).text()).trim();
}

describe("built screen", () => {
	let out: string;
	let browser: Browser;
	let server: ReturnType<typeof Bun.serve>;
	const errors: string[] = [];

	beforeAll(async () => {
		const source = await mkdtemp(join(tmpdir(), "bluprint-bundle-test-"));
		out = await mkdtemp(join(tmpdir(), "bluprint-bundle-test-out-"));
		await writeFile(join(source, "Demo.dc.html"), demo);
		await writeFile(join(source, "Demo QA.dc.html"), demoQa);
		await writeFile(join(source, "README.md"), "# Demo\n");
		await buildBundle(source, out, [
			{ file: "qa.html", states: ["*"] },
			{ file: "tickets/1.2.html", states: ["D2"] },
		]);
		server = Bun.serve({
			port: 0,
			fetch: (request) => {
				const path = decodeURIComponent(new URL(request.url).pathname);
				return new Response(
					Bun.file(join(out, path.endsWith("/") ? `${path}index.html` : path)),
				);
			},
		});
		const { chromium } = createRequire(join(repo, "apps/e2e/package.json"))(
			"@playwright/test",
		);
		browser = await chromium.launch();
	}, 60_000);

	afterAll(async () => {
		await browser.close();
		server.stop();
	});

	async function open(path: string) {
		const page = await browser.newPage();
		page.on("pageerror", (error) => errors.push(error.message));
		await page.goto(new URL(path, server.url).href);
		return page;
	}

	test("writes the screen, the galleries, the docs, the sources and an index", async () => {
		const index = await readFile(join(out, "index.html"), "utf8");
		for (const href of [
			"demo.html",
			"qa.html",
			"tickets/1.2.html",
			"README.md",
			"source/",
		])
			expect(index).toContain(`href="${href}"`);
		expect(await readFile(join(out, "source", "Demo QA.dc.html"), "utf8")).toBe(
			demoQa,
		);
	});

	test("types into camelCase handlers and submits on Enter", async () => {
		const page = await open("demo.html");
		await page.locator("#name").waitFor({ timeout: 15_000 });
		await page.locator("#name").pressSequentially("Casa");
		await page.locator("#ds").pressSequentially("Moinhos");
		expect(await page.locator("#name").inputValue()).toBe("Casa");
		expect(await page.locator("#ds").inputValue()).toBe("Moinhos");
		await page.locator("#name").press("Enter");
		await page.waitForTimeout(200);
		expect(await page.locator("#result").textContent()).toBe("Salvo: Casa");
		expect(
			await page.evaluate(
				() =>
					(
						window as unknown as {
							BluPrintDesignSystem_d4fa62: { __errors: unknown[] };
						}
					).BluPrintDesignSystem_d4fa62.__errors.length,
			),
		).toBe(0);
		expect(errors).toEqual([]);
		await page.close();
	}, 30_000);

	test("renders only a gallery's states, with an index, through the sibling screen", async () => {
		const page = await open("tickets/1.2.html");
		await page.locator("#note").waitFor({ timeout: 15_000 });
		expect(await page.locator("#note").textContent()).toBe("dois");
		expect(await page.locator("[data-screen-label]").count()).toBe(1);
		expect(await page.locator('nav a[href="#D2"]').textContent()).toBe(
			"D2 Segundo · fim",
		);
		expect(errors).toEqual([]);
		await page.close();
	}, 30_000);

	test("mounts every state of a gallery", async () => {
		const page = await open("qa.html");
		await page.locator("#D2 #note").waitFor({ timeout: 15_000 });
		expect(await page.locator("#D1 #note").textContent()).toBe("um");
		expect(await page.locator("#D2 #note").textContent()).toBe("dois");
		await page.close();
	}, 30_000);

	test("stages a version as one commit and refuses to overwrite it", async () => {
		const clone = await mkdtemp(join(tmpdir(), "bluprint-prototypes-test-"));
		await git(clone, "init", "--quiet", "--initial-branch=main");
		await git(clone, "config", "user.email", "test@example.com");
		await git(clone, "config", "user.name", "Test");
		await git(clone, "config", "commit.gpgsign", "false");
		const sha = await stageVersion(out, clone, "demo/v1");
		expect(await git(clone, "rev-parse", "HEAD")).toBe(sha);
		expect(await git(clone, "log", "--format=%s")).toBe(
			"feat: add demo/v1 prototypes",
		);
		expect(await readFile(join(clone, "demo/v1/demo.html"), "utf8")).toBe(
			await readFile(join(out, "demo.html"), "utf8"),
		);
		expect(await readFile(join(clone, "index.html"), "utf8")).toContain(
			'href="demo/"',
		);
		expect(await readFile(join(clone, "demo/index.html"), "utf8")).toContain(
			'href="v1/"',
		);
		await expect(stageVersion(out, clone, "demo/v1")).rejects.toThrow(
			"immutable",
		);
		await expect(stageVersion(out, clone, "Demo/1")).rejects.toThrow(
			"<screen>/v<n>",
		);
	}, 30_000);
});
