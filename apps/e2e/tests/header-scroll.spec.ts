import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

async function createProject(page: Page, reservedUnits = "200") {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Scroll Test");
	await page.getByLabel("E-mail").fill(`scroll-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");
	await page.getByRole("link", { name: "Nova obra" }).click();
	await page.getByLabel("Nome da obra").fill("Scroll building");
	await page.getByLabel("Unidades reservadas").fill(reservedUnits);
	await page.getByRole("button", { name: "Criar obra" }).click();
	await page.getByRole("link", { name: "Início da obra" }).click();
	await expect(
		page.getByRole("link", { name: "Montar estrutura" }),
	).toBeVisible();
}

test.describe("desktop scrolling", () => {
	test.use({ storageState: { cookies: [], origins: [] } });
	test("desktop wizard scrolls its header away and keeps the whole preview 24px from the viewport edges", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "Desktop sticky layout");
		await page.setViewportSize({ width: 1280, height: 600 });
		await createProject(page);
		await page.getByRole("link", { name: "Montar estrutura" }).click();
		await page.getByLabel("Último andar").fill("30");
		await page.getByLabel("Unidades por andar").fill("4");
		await page.mouse.move(600, 300);
		await page.mouse.wheel(0, 450);
		await expect
			.poll(async () => (await page.getByRole("banner").boundingBox())?.y)
			.toBeLessThan(-60);
		const preview = page.getByRole("complementary", { name: "Prévia" });
		await expect.poll(async () => (await preview.boundingBox())?.y).toBe(24);
		await expect
			.poll(async () => {
				const box = await preview.boundingBox();
				return box ? box.y + box.height : Number.POSITIVE_INFINITY;
			})
			.toBeLessThanOrEqual(576);
		await expect(
			preview.getByRole("button", { name: "Criar estrutura" }),
		).toBeInViewport();
		const groundFloor = preview
			.getByRole("list", { name: "Fachada da Torre A" })
			.getByRole("listitem")
			.last();
		await expect(groundFloor).not.toBeInViewport();
		const box = await preview.boundingBox();
		expect(box).not.toBeNull();
		if (!box) throw new Error("Preview has no bounding box");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height - 32);
		await page.mouse.wheel(0, 1500);
		await expect(groundFloor).toBeInViewport();
		await expect.poll(async () => (await preview.boundingBox())?.y).toBe(24);
	});

	test("a crowded desktop preview in a short window scrolls as a whole and keeps a usable façade", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "Desktop sticky layout");
		await page.setViewportSize({ width: 1280, height: 600 });
		await createProject(page, "5");
		await page.getByRole("link", { name: "Montar estrutura" }).click();
		await page.getByLabel("Último andar").fill("30");
		await page.getByLabel("Unidades por andar").fill("4");
		await page.getByRole("button", { name: "Tirar regra 1" }).click();
		await page.evaluate(() => window.scrollTo(0, 0));
		const preview = page.getByRole("complementary", { name: "Prévia" });
		await expect(
			preview.getByText("ficam sem tipologia", { exact: false }),
		).toBeVisible();
		await expect(
			preview.getByRole("button", { name: "Alterar reserva" }),
		).toBeVisible();
		await page.mouse.move(600, 300);
		await page.mouse.wheel(0, 450);
		await expect.poll(async () => (await preview.boundingBox())?.y).toBe(24);
		await expect
			.poll(async () => {
				const box = await preview.boundingBox();
				return box ? box.y + box.height : Number.POSITIVE_INFINITY;
			})
			.toBeLessThanOrEqual(576);
		const facade = preview.getByRole("list", { name: "Fachada da Torre A" });
		const facadeViewportHeight = await facade.evaluate((list) => {
			let scroller = list.parentElement;
			while (scroller && getComputedStyle(scroller).overflowY !== "auto") {
				scroller = scroller.parentElement;
			}
			return scroller?.offsetHeight ?? 0;
		});
		expect(facadeViewportHeight).toBeGreaterThanOrEqual(180);
		const heading = preview.getByRole("heading", { name: "Prévia" });
		const headingBox = await heading.boundingBox();
		if (!headingBox) throw new Error("Preview heading has no bounding box");
		await page.mouse.move(headingBox.x + 4, headingBox.y + 4);
		await page.mouse.wheel(0, 600);
		await expect(facade).toBeInViewport();
		await expect(
			preview.getByRole("button", { name: "Criar estrutura" }),
		).toBeInViewport();
		await expect.poll(async () => (await preview.boundingBox())?.y).toBe(24);
	});

	test("configuration navigation pins at 24px and its section links stay visible", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "Desktop section navigation");
		await page.setViewportSize({ width: 1280, height: 600 });
		await createProject(page);
		await page.getByRole("link", { name: "Montar estrutura" }).click();
		await page.getByLabel("Último andar").fill("3");
		await page.getByLabel("Unidades por andar").fill("4");
		for (let count = 0; count < 3; count++) {
			await page
				.getByRole("button", { name: "Nova tipologia", exact: true })
				.click();
		}
		await page.getByRole("button", { name: "Criar estrutura" }).click();
		await expect(
			page.getByRole("heading", { name: "Fachada", exact: true }),
		).toBeVisible();
		const projectURL = page.url();
		await page.getByRole("link", { name: "Configuração da obra" }).click();
		const navigation = page.getByRole("navigation", {
			name: "Seções da configuração",
		});
		await navigation.getByRole("link", { name: "Status da obra" }).click();
		await expect.poll(async () => (await navigation.boundingBox())?.y).toBe(24);
		await expect
			.poll(
				async () =>
					(
						await page
							.getByRole("region", { name: "Status da obra" })
							.boundingBox()
					)?.y ?? 0,
			)
			.toBeCloseTo(24, 0);
		await navigation.getByRole("link", { name: "Tipologias" }).click();
		await expect(
			page.getByRole("heading", { name: "Tipologias", exact: true }),
		).toBeInViewport();
		await page.goto(`${projectURL}/configuration#tipologias`);
		await expect(
			page.getByRole("heading", { name: "Tipologias", exact: true }),
		).toBeInViewport();
	});
});

test.describe("phone hash", () => {
	test.use({ storageState: { cookies: [], origins: [] } });
	test("opening configuration#tipologias shows Tipologias", async ({
		page,
		isMobile,
	}) => {
		test.skip(!isMobile, "Phone hash landing");
		await createProject(page);
		await page.getByRole("link", { name: "Montar estrutura" }).click();
		await page.getByLabel("Último andar").fill("3");
		await page.getByLabel("Unidades por andar").fill("4");
		await page
			.getByRole("button", { name: "Continuar · Áreas comuns" })
			.click();
		await page.getByRole("button", { name: "Continuar · Tipologias" }).click();
		for (let count = 0; count < 3; count++) {
			await page
				.getByRole("button", { name: "Nova tipologia", exact: true })
				.click();
		}
		await page.getByRole("button", { name: "Continuar · Prévia" }).click();
		await page.getByRole("button", { name: "Criar estrutura" }).click();
		await expect(
			page.getByRole("heading", { name: "Fachada", exact: true }),
		).toBeVisible();
		const projectURL = page.url();
		await page.goto(`${projectURL}/configuration#tipologias`);
		await expect(
			page.getByRole("heading", { name: "Tipologias", exact: true }),
		).toBeInViewport();
		await expect(
			page.getByRole("region", { name: "Dados da obra" }),
		).not.toBeInViewport();
	});
});

test("mobile project filters remain at the viewport top after the app header scrolls away", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "Mobile sticky filters");
	await page.goto("/projects");
	await expect(
		page.getByRole("heading", { level: 1, name: "Obras" }),
	).toBeVisible();
	await page
		.getByRole("list", { name: "Obras" })
		.getByRole("listitem")
		.nth(5)
		.scrollIntoViewIfNeeded();
	await expect
		.poll(async () => (await page.getByRole("banner").boundingBox())?.y)
		.toBeLessThan(-60);
	await expect
		.poll(async () => {
			const input = await page
				.getByRole("textbox", { name: "Buscar obra pelo nome" })
				.boundingBox();
			return input?.y;
		})
		.toBe(8);
});
