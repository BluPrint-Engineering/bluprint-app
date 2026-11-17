export default async function sessionRestore({ page, shot, expect, query, accounts }) {
	const row = (
		await query(
			"SELECT p.id AS project, l.id AS floor FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id JOIN location t ON t.id = l.parent_id WHERE o.name = 'Construtora Horizonte' AND p.name = 'Residencial Jardins' AND t.name = 'Torre B' AND l.name = '10º andar'",
		)
	)[0];
	const signInAgain = async () => {
		await expect(page).toHaveURL(/\/login\?redirect=/);
		await page.getByLabel("E-mail").fill(accounts.ADMIN_EMAIL);
		await page.getByLabel("Senha", { exact: true }).fill(accounts.SEED_PASSWORD);
		await page.getByRole("button", { name: "Entrar" }).click();
	};

	await page.goto(`/projects/${row.project}/locations/${row.floor}`);
	await page.getByRole("button", { name: "Ações do andar" }).click();
	await page.getByRole("menuitem", { name: "Renomear andar" }).click();
	await page.getByRole("dialog", { name: "Renomear o andar" }).getByLabel("Nome").fill("Andar 10A");
	await page.context().clearCookies();
	await page.getByRole("button", { name: "Salvar" }).click();
	await signInAgain();

	const rename = page.getByRole("dialog", { name: "Renomear o andar" });
	await expect(rename.getByLabel("Nome")).toHaveValue("Andar 10A");
	await expect(page.getByRole("dialog")).toHaveCount(1);
	await page.waitForTimeout(300);
	await shot("location-rename-restored");
	await rename.getByRole("button", { name: "Cancelar" }).click();
	await expect(page.getByRole("button", { name: "Ações do andar" })).toBeFocused();
	await page.reload();
	await expect(page.getByRole("heading", { level: 1, name: "10º andar" })).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await shot("location-rename-forgotten");

	await page.goto(`/projects/${row.project}`);
	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await page.getByRole("menuitem", { name: "Torre", exact: true }).click();
	await page.getByLabel("Nome da torre").fill("Torre Z");
	await page.context().clearCookies();
	await page.getByRole("button", { name: "Adicionar", exact: true }).last().click();
	await signInAgain();

	await expect(page.getByLabel("Nome da torre")).toHaveValue("Torre Z");
	await shot("facade-tower-restored");
	await page.getByRole("button", { name: "Cancelar" }).click();
	await expect(page.getByRole("button", { name: "Adicionar", exact: true })).toBeFocused();
	await expect(page.getByLabel("Nome da torre")).toHaveCount(0);
	expect(
		(await query("SELECT count(*)::int AS n FROM location l JOIN project p ON p.id = l.project_id WHERE p.id = $1 AND l.name IN ('Andar 10A', 'Torre Z')", [row.project]))[0].n,
	).toBe(0);
}
