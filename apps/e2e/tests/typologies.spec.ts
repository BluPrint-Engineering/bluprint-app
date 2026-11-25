import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});
test.describe.configure({ retries: 0 });

async function openConfigurationOfANewProject(page: Page) {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Bruno Teste");
	await page.getByLabel("E-mail").fill(`tipologias-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");

	await page.goto("/projects/new");
	await page.getByLabel("Nome da obra").fill("Casa Moinhos");
	await page.getByLabel("Unidades reservadas").fill("10");
	await page.getByRole("button", { name: "Criar obra" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
}

test("creates a common-area tipologia, fills its rooms and sees it in its group, unused", async ({
	page,
}) => {
	await openConfigurationOfANewProject(page);
	const tipologias = page.getByRole("region", { name: "Tipologias" });
	const unidades = tipologias.getByRole("region", { name: "Unidades" });
	const areas = tipologias.getByRole("region", { name: "Áreas comuns" });
	await expect(unidades.getByText("0 tipologias")).toBeVisible();
	await expect(areas.getByText("0 tipologias")).toBeVisible();
	await expect(
		areas.getByText("Nenhuma tipologia de área comum."),
	).toBeVisible();

	await areas
		.getByRole("button", { name: "Nova tipologia de área comum" })
		.click();
	const dialog = page.getByRole("dialog", {
		name: "Nova tipologia de área comum",
	});
	await dialog.getByRole("textbox", { name: "Nome" }).fill("Corredor");
	await dialog.getByRole("button", { name: "Criar" }).click();

	const room = page.getByRole("textbox", { name: "Novo cômodo" });
	await expect(room).toBeFocused();
	await room.fill("Circulação");
	await room.press("Enter");
	await room.fill("Escada");
	await room.press("Enter");
	await expect(
		page.getByText("Nenhuma área comum usa a Corredor ainda."),
	).toBeVisible();
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(page.getByText("Corredor salva.")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Ações da Corredor" }),
	).toBeFocused();
	await expect(areas.getByText("1 tipologia", { exact: true })).toBeVisible();
	await expect(unidades.getByText("0 tipologias")).toBeVisible();
	const row = areas.getByRole("button", { name: /^Corredor/ });
	await expect(row).toContainText("2 cômodos ·");
	await expect(row.getByText("Sem uso")).toBeVisible();

	await row.click();
	await expect(row).toHaveAttribute("aria-expanded", "true");
	await expect(
		areas.getByRole("listitem").filter({ hasText: /^Circulação$/ }),
	).toBeVisible();
	await expect(
		areas.getByRole("listitem").filter({ hasText: /^Escada$/ }),
	).toBeVisible();

	await page.reload();
	await expect(
		areas.getByRole("button", { name: /^Corredor/ }).getByText("Sem uso"),
	).toBeVisible();
	await expect(areas.getByText("1 tipologia", { exact: true })).toBeVisible();
});
