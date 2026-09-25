import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.describe("signed out", () => {
	test.use({ storageState: { cookies: [], origins: [] } });
	// /sign-up/email allows 5/min/IP and each project already spends one; a retry can't add to it
	test.describe.configure({ retries: 0 });

	test("creates an account through the screen and gets a real session", async ({
		page,
	}) => {
		const email = `signup-${randomUUID()}@e2e.test`;

		await page.goto("/signup");

		await page.getByLabel("Nome completo").fill("Bruno Teste");
		await page.getByLabel("E-mail").fill(email);
		await page.getByLabel("Senha", { exact: true }).fill("bluprint123");
		await page
			.getByRole("checkbox", {
				name: "Aceito os termos de uso e a política de privacidade",
			})
			.click();
		await page.getByRole("button", { name: "Criar conta" }).click();

		await expect(page).toHaveURL("/");

		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find(
			(cookie) => cookie.name === "better-auth.session_token",
		);
		expect(sessionCookie?.httpOnly).toBe(true);

		const session = await page.request.get("/api/auth/get-session");
		expect((await session.json()).user.email).toBe(email);
	});
});
