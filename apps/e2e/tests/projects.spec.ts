import { expect, test } from "@playwright/test";

// the seed gives the admin's organization 14 projects: one page of 12, then 2
test.describe("project list", () => {
	test("opening the app lands on the admin's projects", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveURL("/projects");
		await expect(page.getByRole("heading", { name: "Obras" })).toBeVisible();
		await expect(page.getByText("14 obras")).toBeVisible();
		await expect(
			page.getByRole("list", { name: "Obras" }).getByRole("listitem"),
		).toHaveCount(12);
		await expect(page.getByText("Torre Atlântica")).toBeVisible();
	});

	test("on the phone, shows the first 12 in one column, then the rest as the list scrolls", async ({
		page,
		isMobile,
	}) => {
		test.skip(!isMobile, "the phone layout");

		await page.goto("/projects");

		const cards = page
			.getByRole("list", { name: "Obras" })
			.getByRole("listitem");
		await expect(cards).toHaveCount(12);
		const [first, second] = [
			await cards.nth(0).boundingBox(),
			await cards.nth(1).boundingBox(),
		];
		expect(second?.x).toBe(first?.x);
		await expect(
			page.getByRole("navigation", { name: "Páginas de obras" }),
		).toBeHidden();

		await cards.last().scrollIntoViewIfNeeded();

		await expect(cards).toHaveCount(14);
		await expect(page.getByText("Residencial Jardins")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Carregar mais" }),
		).toBeHidden();
	});

	test("on the desktop, pages through the list with the page in the address", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "the desktop layout");

		await page.goto("/projects");
		await expect(page.getByText("Mostrando 1–12 de 14")).toBeVisible();

		await page.getByRole("button", { name: "Página 2" }).click();

		await expect(page).toHaveURL("/projects?page=2");
		await expect(page.getByText("Mostrando 13–14 de 14")).toBeVisible();
		await expect(
			page.getByRole("list", { name: "Obras" }).getByRole("listitem"),
		).toHaveCount(2);
		await expect(page.getByText("Residencial Jardins")).toBeVisible();

		// a short page keeps the pages at the bottom of the screen, not right under the cards
		const pages = await page
			.getByRole("navigation", { name: "Páginas de obras" })
			.boundingBox();
		const viewport = page.viewportSize();
		expect((pages?.y ?? 0) + (pages?.height ?? 0)).toBeGreaterThan(
			(viewport?.height ?? 0) - 64,
		);
	});

	// Diego manages Edifício Aurora and Condomínio Porto Belo, and is only assistant on Residencial Jardins
	test("on the desktop, the admin filters by manager from the toolbar", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "the desktop layout");

		await page.goto("/projects");
		await page.getByRole("button", { name: "Gerente: Todos" }).click();
		await page.getByRole("menuitemradio", { name: "Diego Almeida" }).click();

		await expect(page).toHaveURL(/\/projects\?manager=/);
		await expect(page.getByText("2 obras")).toBeVisible();
		await expect(page.getByText("Edifício Aurora")).toBeVisible();
		await expect(page.getByText("Condomínio Porto Belo")).toBeVisible();
		await expect(page.getByText("Residencial Jardins")).toBeHidden();

		await page.getByRole("button", { name: "Limpar filtros" }).click();

		await expect(page).toHaveURL("/projects");
		await expect(page.getByText("14 obras")).toBeVisible();
	});

	test("on the phone, the admin filters by manager from the sheet", async ({
		page,
		isMobile,
	}) => {
		test.skip(!isMobile, "the phone layout");

		await page.goto("/projects");
		await page.getByRole("button", { name: "Filtros" }).click();
		const sheet = page.getByRole("dialog", { name: "Filtros" });
		await sheet.getByRole("radio", { name: "Diego Almeida" }).click();
		await sheet.getByRole("button", { name: "Ver 2 obras" }).click();

		await expect(page).toHaveURL(/\/projects\?manager=/);
		// exact: the closing sheet's "Ver 2 obras" is still in the page for a moment
		await expect(page.getByText("2 obras", { exact: true })).toBeVisible();
		await expect(page.getByText("Condomínio Porto Belo")).toBeVisible();
	});
});
