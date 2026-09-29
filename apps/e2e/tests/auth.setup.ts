import { expect, test as setup } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "../auth-state";
import { ADMIN_EMAIL, SEED_PASSWORD } from "../seed-account";

setup.describe.configure({ retries: 0 });

setup("authenticate as an org admin", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();

	await expect(page).toHaveURL("/projects");
	await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
