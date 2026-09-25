import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, SEED_PASSWORD } from "../seed-account";

test.describe("signed out", () => {
	test.use({ storageState: { cookies: [], origins: [] } });
	// a real sign-in per project already spends part of the 5/min/IP budget; a retry can't add to it
	test.describe.configure({ retries: 0 });

	test("logs in through the screen and gets a real session", async ({
		page,
	}) => {
		await page.goto("/login");

		await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
		await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
		await page.getByRole("button", { name: "Entrar" }).click();

		await expect(page).toHaveURL("/");

		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find(
			(cookie) => cookie.name === "better-auth.session_token",
		);
		expect(sessionCookie?.httpOnly).toBe(true);

		const session = await page.request.get("/api/auth/get-session");
		expect((await session.json()).user.email).toBe(ADMIN_EMAIL);
	});
});

test.describe("signed out, opening a protected screen", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("lands on the login, remembering where it was going", async ({
		page,
	}) => {
		await page.goto("/");

		await expect(page).toHaveURL("/login?redirect=%2F");
		await expect(page.getByLabel("E-mail")).toBeVisible();
	});
});

test.describe("already signed in", () => {
	test("skips the login screen and keeps the session on reload", async ({
		page,
	}) => {
		await page.goto("/login");

		await expect(page).toHaveURL("/");

		await page.reload();
		const session = await page.request.get("/api/auth/get-session");
		expect((await session.json()).user.email).toBe(ADMIN_EMAIL);
	});
});
