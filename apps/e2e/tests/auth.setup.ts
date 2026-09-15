import { expect, test as setup } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "../auth-state";
import { ADMIN_EMAIL, SEED_PASSWORD } from "../seed-account";

// one real sign-in shared across projects via storageState — /sign-in/email rate-limits at 5/min/IP
setup.describe.configure({ retries: 0 });

setup("authenticate as an org admin", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();

	await expect(page).toHaveURL("/");
	await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
