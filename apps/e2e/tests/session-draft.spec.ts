import { expect, test } from "@playwright/test";
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
