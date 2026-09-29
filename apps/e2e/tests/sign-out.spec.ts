import { expect, test } from "@playwright/test";
import { MANAGER_EMAIL, MANAGER_NAME, SEED_PASSWORD } from "../seed-account";

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ retries: 0 });

test("signs out from the account menu, back to the login", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("E-mail").fill(MANAGER_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page).toHaveURL("/projects");
	await expect(
		page.getByRole("list", { name: "Obras" }).getByRole("listitem").first(),
	).toBeVisible();
	await expect(page.getByRole("button", { name: /^Gerente:/ })).toBeHidden();

	await page.getByRole("button", { name: `Conta de ${MANAGER_NAME}` }).click();
	await expect(page.getByRole("menu")).toContainText(MANAGER_EMAIL);
	await page.getByRole("menuitem", { name: "Sair" }).click();

	await expect(page).toHaveURL("/login");
	await expect(page.getByLabel("E-mail")).toBeVisible();

	const session = await page.request.get("/api/auth/get-session");
	expect(await session.json()).toBeNull();
});
