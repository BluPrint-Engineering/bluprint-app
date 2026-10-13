export default async function login({ page, shot, expect, query, accounts }) {
	const sessionsOf = async (email: string) =>
		(
			await query('SELECT count(*)::int AS n FROM "session" s JOIN "user" u ON u.id = s.user_id WHERE u.email = $1', [
				email,
			])
		)[0].n;
	const before = await sessionsOf(accounts.ADMIN_EMAIL);

	await page.goto("/projects");
	await expect(page).toHaveURL("/login?redirect=%2Fprojects");
	await expect(page.getByLabel("E-mail")).toBeVisible();
	await shot("login-screen");

	await page.getByLabel("E-mail").fill(accounts.ADMIN_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill("senha-que-nao-e-esta");
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
	await shot("wrong-password");

	await page.getByLabel("Senha", { exact: true }).fill(accounts.SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page).toHaveURL("/projects");
	await expect(page.getByRole("list", { name: "Obras" }).getByRole("listitem")).toHaveCount(12);
	await shot("projects-after-login");

	const cookie = (await page.context().cookies()).find((c) => c.name === "better-auth.session_token");
	expect(cookie?.httpOnly).toBe(true);
	const session = await (await page.request.get("/api/auth/get-session")).json();
	expect(session.user.email).toBe(accounts.ADMIN_EMAIL);
	expect(await sessionsOf(accounts.ADMIN_EMAIL)).toBe(before + 1);
}
