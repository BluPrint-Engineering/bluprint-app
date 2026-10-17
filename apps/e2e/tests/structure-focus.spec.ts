import { expect, type Page, test } from "@playwright/test";

async function openFirstFloorOfPortoBelo(page: Page) {
	await page.goto("/projects");
	await page.getByRole("link", { name: /Condomínio Porto Belo/ }).click();
	await page.getByRole("link", { name: /^Torre A/ }).click();
	await page.getByRole("link", { name: /^1º andar/ }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "1º andar" }),
	).toBeVisible();
}

test("a taken unit number keeps the focus in the add field, so Escape still closes it", async ({
	page,
}) => {
	await openFirstFloorOfPortoBelo(page);
	await page.getByRole("button", { name: "Adicionar unidade" }).click();
	const field = page.getByRole("textbox", { name: "Adicionar unidade" });
	await field.fill("101");

	await field.press("Enter");

	await expect(page.getByRole("alert")).toHaveText(
		"Já existe a unidade 101 na Torre A.",
	);
	await expect(field).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(field).toBeHidden();
});

test("renaming from a unit's menu opens with the focus on Nome", async ({
	page,
}) => {
	await openFirstFloorOfPortoBelo(page);

	await page.getByRole("button", { name: "Ações da unidade 101" }).click();
	await page.getByRole("menuitem", { name: "Renomear" }).click();

	const name = page.getByRole("dialog").getByRole("textbox", { name: "Nome" });
	await expect(name).toHaveValue("101");
	await expect(name).toBeFocused();
});
