import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { ADMIN_EMAIL, SEED_PASSWORD } from "../seed-account";

test("a saved form comes back filled after the session expires", async ({
	page,
}) => {
	await page.goto("/projects");
	await page.getByRole("link", { name: "Nova obra" }).click();
	await expect(page).toHaveURL("/projects/new");
	await page.getByLabel("Nome da obra").fill("Casa do rascunho");
	await page.getByLabel("Unidades reservadas").fill("12");
	await page.context().clearCookies();
	await page.getByRole("button", { name: "Criar obra" }).click();

	await expect(page).toHaveURL(/\/login\?redirect=%2Fprojects%2Fnew$/);
	await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();

	await expect(page).toHaveURL("/projects/new");
	await expect(page.getByLabel("Nome da obra")).toHaveValue("Casa do rascunho");
	await expect(page.getByLabel("Unidades reservadas")).toHaveValue("12");
	await expect(page.getByRole("button", { name: "Criar obra" })).toBeEnabled();
});

test.describe("on a floor whose reserve is spent", () => {
	test.use({
		storageState: { cookies: [], origins: [] },
		extraHTTPHeaders: {
			"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
		},
	});

	const password = "tres-lajes-e-um-prumo";

	async function signUp(page: Page, email: string) {
		await page.goto("/signup");
		await page.getByLabel("Nome completo").fill("Bruno Teste");
		await page.getByLabel("E-mail").fill(email);
		await page.getByLabel("Senha", { exact: true }).fill(password);
		await page
			.getByRole("checkbox", {
				name: "Aceito os termos de uso e a política de privacidade",
			})
			.click();
		await page.getByRole("button", { name: "Criar conta" }).click();
		await expect(page).toHaveURL("/projects");
	}

	async function continueTo(page: Page, step: string) {
		const button = page.getByRole("button", { name: `Continuar · ${step}` });
		if (await button.isVisible()) await button.click();
	}

	async function buildSpentFloor(page: Page) {
		await page.goto("/projects/new");
		await page.getByLabel("Nome da obra").fill("Casa Moinhos");
		await page.getByLabel("Unidades reservadas").fill("16");
		await page.getByRole("button", { name: "Criar obra" }).click();
		await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
		await page.getByRole("link", { name: "Início da obra" }).click();
		await page.getByRole("link", { name: "Montar estrutura" }).click();
		await page.getByLabel("Último andar").fill("3");
		await page.getByLabel("Unidades por andar").fill("4");
		await continueTo(page, "Áreas comuns");
		await continueTo(page, "Tipologias");
		await page.getByLabel("Novo cômodo da Tipologia A").fill("Sala");
		await page.getByLabel("Novo cômodo da Tipologia A").press("Enter");
		await continueTo(page, "Prévia");
		await expect(
			page.getByText(
				"Usa 16 das 16 unidades que restam nesta obra. Depois de criar, sobram 0.",
			),
		).toBeVisible();
		await page.getByRole("button", { name: "Criar estrutura" }).click();
		await page
			.getByRole("list", { name: "Fachada" })
			.getByRole("link", { name: "1º andar" })
			.click();
		await expect(
			page.getByRole("heading", { level: 1, name: "1º andar" }),
		).toBeVisible();
	}

	test("a reserve change sent from the floor's Duplicar comes back inside that Duplicar", async ({
		page,
	}) => {
		const email = `session-floor-${randomUUID()}@e2e.test`;
		await signUp(page, email);
		await buildSpentFloor(page);
		const floorUrl = page.url();

		await page.getByRole("button", { name: "Ações do andar" }).click();
		await page.getByRole("menuitem", { name: "Duplicar andar" }).click();
		const duplicate = page.getByRole("dialog", { name: "Duplicar o 1º andar" });
		await duplicate.getByRole("button", { name: "Alterar reserva" }).click();
		const reserve = page.getByRole("dialog", { name: "Alterar reserva" });
		await reserve.getByLabel("Unidades reservadas").fill("30");
		await page.context().clearCookies();
		await reserve.getByRole("button", { name: "Salvar" }).click();

		await expect(page).toHaveURL(/\/login\?redirect=/);
		await page.getByLabel("E-mail").fill(email);
		await page.getByLabel("Senha", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Entrar" }).click();

		await expect(page).toHaveURL(floorUrl);
		await expect(
			page
				.getByRole("dialog", { name: "Alterar reserva" })
				.getByLabel("Unidades reservadas"),
		).toHaveValue("30");
		await expect(
			page.getByRole("dialog", {
				name: "Duplicar o 1º andar",
				includeHidden: true,
			}),
		).toHaveCount(1);
		await expect(
			page.getByRole("dialog", {
				name: /^Duplicar a unidade/,
				includeHidden: true,
			}),
		).toHaveCount(0);
		await expect(page.getByRole("dialog", { includeHidden: true })).toHaveCount(
			2,
		);
	});
});
