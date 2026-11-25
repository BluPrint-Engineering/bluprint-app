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

	const hall = (
		await query(
			"SELECT l.id FROM location l JOIN location f ON f.id = l.parent_id JOIN location t ON t.id = f.parent_id WHERE l.project_id = $1 AND t.name = 'Torre A' AND f.name = '3º andar' AND l.type = 'common_area' AND l.name = 'Hall'",
			[row.project],
		)
	)[0].id;
	await page.goto(`/projects/${row.project}/locations/${hall}`);
	const changeButton = page.getByRole("button", { name: "Trocar tipologia" });
	await changeButton.click();
	const change = page.getByRole("dialog", { name: "Trocar a tipologia da área comum Hall" });
	await change.getByRole("radio", { name: /Corredor/ }).click();
	await page.context().clearCookies();
	await change.getByRole("button", { name: "Trocar" }).click();
	await signInAgain();

	await expect(change.getByRole("radio", { name: /Corredor/ })).toBeChecked();
	await expect(page.getByRole("dialog")).toHaveCount(1);
	await page.waitForTimeout(300);
	await shot("common-area-change-type-restored");
	await change.getByRole("button", { name: "Cancelar" }).click();
	await expect(changeButton).toBeFocused();
	await page.reload();
	await expect(page.getByRole("heading", { level: 1, name: "Hall" })).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	expect((await query("SELECT t.name FROM location l JOIN typology t ON t.id = l.typology_id WHERE l.id = $1", [hall]))[0].name).toBe("Hall padrão");

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
	await page.goto(`/projects/${row.project}/configuration`);
	await page.getByRole("button", { name: "Ações da Tipologia B" }).click();
	await page.getByRole("menuitem", { name: "Copiar" }).click();
	const copy = page.getByRole("dialog", { name: "Copiar Tipologia B" });
	await copy.getByLabel("Nome da cópia").fill("Tipologia B Garden");
	await page.context().clearCookies();
	await copy.getByRole("button", { name: "Copiar" }).click();
	await signInAgain();

	await expect(copy.getByLabel("Nome da cópia")).toHaveValue("Tipologia B Garden");
	await expect(page.getByRole("dialog")).toHaveCount(1);
	await page.waitForTimeout(300);
	await shot("typology-copy-restored");
	await copy.getByRole("button", { name: "Cancelar" }).click();
	await expect(page.getByRole("button", { name: "Ações da Tipologia B" })).toBeFocused();
	await page.reload();
	await expect(page.getByRole("heading", { level: 3, name: "Tipologias" })).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	expect((await query("SELECT count(*)::int AS n FROM typology WHERE project_id = $1 AND name = 'Tipologia B Garden'", [row.project]))[0].n).toBe(0);

	expect(
		(await query("SELECT count(*)::int AS n FROM location l JOIN project p ON p.id = l.project_id WHERE p.id = $1 AND l.name IN ('Andar 10A', 'Torre Z')", [row.project]))[0].n,
	).toBe(0);
}
