import { randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { DATABASE_URL_E2E } from "../env";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});
test.describe.configure({ retries: 0 });

test("an idle session sends the next visit to login and back to the same screen", async ({
	page,
}) => {
	const email = `idle-${randomUUID()}@e2e.test`;
	const password = "tres-lajes-e-um-prumo";

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

	await page.goto("/projects/new");
	await expect(page.getByRole("heading", { name: "Nova obra" })).toBeVisible();

	const client = new Client({ connectionString: DATABASE_URL_E2E });
	await client.connect();
	try {
		await client.query(
			`UPDATE "session" SET expires_at = now() - interval '1 second'
			 WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
			[email],
		);
	} finally {
		await client.end();
	}

	const cookies = await page.context().cookies();
	await page.context().clearCookies();
	await page
		.context()
		.addCookies(
			cookies.filter(
				(cookie) => !cookie.name.startsWith("better-auth.session_data"),
			),
		);

	await page.goto("/projects/new");

	await expect(page).toHaveURL("/login?redirect=%2Fprojects%2Fnew");
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Entrar" }).click();

	await expect(page).toHaveURL("/projects/new");
	await expect(page.getByRole("heading", { name: "Nova obra" })).toBeVisible();
});
