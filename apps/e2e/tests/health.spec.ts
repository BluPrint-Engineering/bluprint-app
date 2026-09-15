// TODO(#42): replace with the login flow when the web health page is removed
import { expect, test } from "@playwright/test";

test("shows the API health status", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "BluPrint" })).toBeVisible();
	await expect(page.getByText("API no ar")).toBeVisible();
});
