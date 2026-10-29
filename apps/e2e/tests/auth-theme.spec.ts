import { expect, test } from "@playwright/test";

test.describe("signed-out theme layout", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("keeps the login components in place through theme changes", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 664 });
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/login");
		await expect(page.getByLabel("E-mail")).toBeVisible();
		await page.locator("body").evaluate(async (body) => {
			await body.ownerDocument.fonts.ready;
		});

		const layout = () =>
			page.locator("aside, main, form, input, button").evaluateAll((elements) =>
				elements.map((element) => {
					const { x, y, width, height } = element.getBoundingClientRect();
					return { x, y, width, height };
				}),
			);
		const initial = await layout();

		await page.emulateMedia({ colorScheme: "dark" });
		expect(await layout()).toEqual(initial);
		await page.emulateMedia({ colorScheme: "light" });
		expect(await layout()).toEqual(initial);

		await page.getByRole("button", { name: "Usar tema escuro" }).click();
		await expect(page.locator("html")).toHaveClass("dark");
		expect(await layout()).toEqual(initial);

		await page.getByRole("button", { name: "Usar tema claro" }).click();
		await expect(page.locator("html")).not.toHaveClass("dark");
		expect(await layout()).toEqual(initial);
	});
});
