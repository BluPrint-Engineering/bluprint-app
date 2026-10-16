export default async function projectHome({ page, shot, expect, query, accounts }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const signedIn = session !== null;
	const manager = signedIn && session.user.email === accounts.MANAGER_EMAIL;
	const missing = "0190a000-0000-7000-8000-000000000000";
	const notFound = page.getByRole("heading", { level: 1, name: "Obra não encontrada" });

	if (!signedIn) {
		await page.goto(`/projects/${missing}`);
		await expect(page).toHaveURL(`/login?redirect=%2Fprojects%2F${missing}`);
		await page.goto("/nao-existe");
		await expect(page).toHaveURL("/login?redirect=%2Fnao-existe");
		await shot("signed-out-to-login");
		return;
	}

	await page.goto("/projects?q=Jardins");
	await shot("list-before");
	await page.getByRole("link", { name: /Residencial Jardins/ }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
	await expect(page.getByRole("heading", { level: 1, name: "Residencial Jardins" })).toBeVisible();
	await expect(page.getByText("Em andamento")).toBeVisible();
	await expect(page.getByRole("heading", { name: "A obra ainda não tem estrutura" })).toBeVisible();
	await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
	if (manager) await expect(page.getByText("Gerente de obra")).toBeVisible();
	else await expect(page.getByText("Gerente de obra")).toHaveCount(0);
	await shot("home-active");

	await page.getByRole("link", { name: "Obras", exact: true }).click();
	await expect(page).toHaveURL(/\/projects/);

	await page.goto("/projects?status=delivered&q=Vila Nova");
	await page.getByRole("link", { name: /Residencial Vila Nova/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Residencial Vila Nova" })).toBeVisible();
	await expect(page.getByText("Entregue")).toBeVisible();
	await expect(page.getByText("Em andamento")).toHaveCount(0);
	await shot("home-delivered");

	await page.goto("/projects/not-a-uuid");
	await expect(notFound).toBeVisible();
	await shot("not-found-invalid-id");
	await page.goto(`/projects/${missing}`);
	await expect(notFound).toBeVisible();

	const [{ id }] = await query("SELECT id FROM project WHERE name = 'Galpão Logístico Sul'");
	await page.goto(`/projects/${id}`);
	if (manager) await expect(notFound).toBeVisible();
	else await expect(page.getByRole("heading", { level: 1, name: "Galpão Logístico Sul" })).toBeVisible();
	await shot("seeded-project-not-on");

	await page.goto("/nao-existe");
	await expect(page.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
	await shot("not-found-route");
	await page.getByRole("link", { name: "Voltar para obras" }).click();
	await expect(page).toHaveURL("/projects");
}
