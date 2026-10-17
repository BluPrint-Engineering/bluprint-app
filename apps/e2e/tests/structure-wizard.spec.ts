import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});
test.describe.configure({ retries: 0 });

async function signUp(page: Page) {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Bruno Teste");
	await page.getByLabel("E-mail").fill(`wizard-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");
}

async function createProject(page: Page, name: string, units: string) {
	await page.goto("/projects/new");
	await page.getByLabel("Nome da obra").fill(name);
	await page.getByLabel("Unidades reservadas").fill(units);
	await page.getByRole("button", { name: "Criar obra" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	await page.getByRole("link", { name: "Início da obra" }).click();
	await expect(
		page.getByRole("heading", { name: "A obra ainda não tem estrutura" }),
	).toBeVisible();
}

async function describeTower(page: Page, last: string, perFloor: string) {
	await page.getByLabel("Último andar").fill(last);
	await page.getByLabel("Unidades por andar").fill(perFloor);
}

async function continueTo(page: Page, step: string) {
	const button = page.getByRole("button", { name: `Continuar · ${step}` });
	if (await button.isVisible()) await button.click();
}

test("a new account reserves units for a project, builds its structure with the wizard and sees the façade", async ({
	page,
}) => {
	await signUp(page);
	await createProject(page, "Casa Moinhos", "75");

	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/structure\/new$/);
	await expect(
		page.getByRole("heading", { level: 1, name: "Montar estrutura" }),
	).toBeVisible();

	await describeTower(page, "3", "4");
	await continueTo(page, "Áreas comuns");
	await page.getByLabel("Área comum da obra").fill("Guarita");
	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Tirar Guarita" }),
	).toBeVisible();
	await continueTo(page, "Prévia");

	await expect(
		page.getByText("1 torre · 4 andares · 12 unidades"),
	).toBeVisible();
	await expect(page.getByText("5 áreas comuns")).toBeVisible();
	await expect(
		page.getByText(
			"Usa 12 das 75 unidades que restam nesta obra. Depois de criar, sobram 63.",
		),
	).toBeVisible();

	await page.getByRole("button", { name: "Criar estrutura" }).click();

	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
	await expect(
		page.getByText("Estrutura criada: 1 torre e 12 unidades."),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { level: 2, name: "Fachada" }),
	).toBeVisible();
	const facade = page.getByRole("list", { name: "Fachada" });
	await expect(facade.getByRole("listitem")).toHaveCount(4);
	await expect(facade.getByRole("link", { name: "Unidade 304" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Guarita" })).toBeVisible();
	await expect(page.getByText("Torre A")).toHaveCount(0);

	await facade.getByRole("link", { name: "Unidade 304" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "304" }),
	).toBeVisible();
});

test("a project whose reservation is smaller than the plan cannot be sent", async ({
	page,
}) => {
	await signUp(page);
	await createProject(page, "Casa Menor", "5");

	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await describeTower(page, "3", "4");
	await continueTo(page, "Áreas comuns");
	await continueTo(page, "Prévia");

	await expect(
		page.getByText(
			/Esta estrutura tem 12 unidades e a obra tem\s5\. Tire 7 unidades ou aumente a reserva\./,
		),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Alterar reserva" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Criar estrutura" }),
	).toBeDisabled();
});
