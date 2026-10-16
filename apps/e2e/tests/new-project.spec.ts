import { randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { NO_UNITS_ADMIN_EMAIL, SEED_PASSWORD } from "../seed-account";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});
test.describe.configure({ retries: 0 });

test("a new account creates its first project from the list, renames it and finds it back", async ({
	page,
}) => {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Bruno Teste");
	await page.getByLabel("E-mail").fill(`new-project-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");

	await expect(page.getByText("Nenhuma obra ainda")).toBeVisible();
	await expect(page.getByText("500 unidades livres")).toBeVisible();
	await page.getByRole("link", { name: "Nova obra" }).click();

	await expect(page).toHaveURL("/projects/new");
	await page.getByLabel("Nome da obra").fill("Casa Moinhos");
	await page.getByLabel("Unidades reservadas").fill("75");
	await expect(
		page.getByText("500 livres na construtora. Depois de criar, sobram 425."),
	).toBeVisible();
	await page.getByRole("button", { name: "Criar obra" }).click();

	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	await expect(page.getByText("Obra “Casa Moinhos” criada.")).toBeVisible();

	await page.getByRole("button", { name: "Renomear" }).click();
	await page
		.getByRole("textbox", { name: "Nome da obra" })
		.fill("Casa Moinhos II");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Casa Moinhos II" }),
	).toBeVisible();

	await page.getByRole("link", { name: "Início da obra" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Casa Moinhos II" }),
	).toBeVisible();
	await page.getByRole("link", { name: "Obras", exact: true }).click();

	await expect(page).toHaveURL("/projects");
	await expect(
		page.getByRole("list", { name: "Obras" }).getByText("Casa Moinhos II"),
	).toBeVisible();
	await expect(page.getByText("425 unidades livres")).toBeVisible();
	await expect(page.getByRole("link", { name: "Nova obra" })).toBeEnabled();
});

test("an admin without free units sees the entry disabled and what to do", async ({
	page,
}) => {
	await page.goto("/login");
	await page.getByLabel("E-mail").fill(NO_UNITS_ADMIN_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page).toHaveURL("/projects");

	await expect(
		page.getByText(
			"Nenhuma unidade livre. Baixe a reserva de uma obra ou fale com a BluPrint.",
		),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Nova obra" })).toBeDisabled();
	await expect(page.getByRole("link", { name: "Nova obra" })).toHaveCount(0);
});
