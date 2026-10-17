export default async function rooms({ page, shot: rawShot, expect, query }) {
	const shot = async (name) => {
		await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
		await rawShot(name);
	};
	const projectId = async (name) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const unitId = async (project, tower, name) =>
		(await query("SELECT u.id FROM location u JOIN location f ON f.id = u.parent_id JOIN location t ON t.id = f.parent_id JOIN project p ON p.id = u.project_id JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte' AND t.name = $2 AND u.type = 'unit' AND u.name = $3", [project, tower, name]))[0].id;
	const roomNames = async (id) =>
		(await query("SELECT name FROM room WHERE location_id = $1 ORDER BY position, name", [id])).map((r) => r.name);
	const menu = async (name, action) => {
		await page.getByRole("button", { name: `Ações do cômodo ${name}` }).click();
		await page.getByRole("menuitem", { name: action }).click();
	};

	const jardins = await projectId("Residencial Jardins");
	const unit903 = await unitId("Residencial Jardins", "Torre A", "903");
	await page.goto(`/projects/${jardins}/locations/${unit903}`);
	await expect(page.getByRole("heading", { level: 1, name: "903" })).toBeVisible();
	await expect(page.getByText("3 alterações")).toBeVisible();
	await expect(page.getByRole("button", { name: "Trocar tipologia" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Voltar à tipologia" })).toBeVisible();
	await shot("unit-with-changes");

	await page.getByRole("button", { name: "Ações do cômodo Sala" }).click();
	await expect(page.getByRole("menuitem", { name: "Remover desta unidade" })).toBeVisible();
	await shot("room-menu-type-room");
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Ações do cômodo Home office" }).click();
	await expect(page.getByRole("menuitem", { name: "Remover cômodo" })).toBeVisible();
	await shot("room-menu-own-room");
	await page.keyboard.press("Escape");

	await page.getByRole("button", { name: "Adicionar cômodo" }).click();
	await expect(page.getByLabel("Adicionar cômodo")).toBeFocused();
	await shot("add-room-form");
	await page.getByLabel("Adicionar cômodo").fill("cozinha");
	await page.getByLabel("Adicionar cômodo").press("Enter");
	await expect(page.getByText("Já existe o cômodo cozinha nesta unidade.")).toBeVisible();
	await shot("add-room-name-taken");
	await page.getByLabel("Adicionar cômodo").fill("Despensa");
	await page.getByLabel("Adicionar cômodo").press("Enter");
	await expect(page.getByRole("list", { name: "Cômodos" }).getByText("Despensa")).toBeVisible();
	await expect(page.getByText("4 alterações")).toBeVisible();
	expect(await roomNames(unit903)).toContain("Despensa");
	await shot("room-added");

	await menu("Despensa", "Renomear");
	const rename = page.getByRole("dialog", { name: "Renomear o cômodo" });
	await expect(rename).toBeVisible();
	await shot("rename-dialog");
	await rename.getByLabel("Nome").fill("Dormitório 1");
	await rename.getByLabel("Nome").press("Enter");
	await expect(rename.getByText("Já existe o cômodo Dormitório 1 nesta unidade.")).toBeVisible();
	await shot("rename-name-taken");
	await rename.getByLabel("Nome").fill("Depósito");
	await rename.getByRole("button", { name: "Salvar" }).click();
	await expect(rename).toBeHidden();
	await expect(page.getByRole("list", { name: "Cômodos" }).getByText("Depósito")).toBeVisible();
	await shot("room-renamed");

	await menu("Sala", "Remover desta unidade");
	const dropped = page.getByRole("list", { name: "Tirados desta unidade" });
	await expect(dropped.getByText("Sala")).toBeVisible();
	await expect(page.getByText("5 alterações")).toBeVisible();
	await shot("room-taken-out");

	await page.getByRole("button", { name: "Devolver o cômodo Sala" }).click();
	await expect(page.getByRole("list", { name: "Cômodos" }).getByText("Sala", { exact: true })).toBeVisible();
	await shot("room-given-back");

	await menu("Depósito", "Remover cômodo");
	await expect(page.getByRole("list", { name: "Cômodos" }).getByText("Depósito")).toBeHidden();

	await page.getByRole("button", { name: "Voltar à tipologia" }).click();
	await expect(page.getByText("A unidade 903 voltou à tipologia Tipologia A.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Voltar à tipologia" })).toBeHidden();
	expect(await roomNames(unit903)).toEqual(["Sala", "Cozinha", "Área de serviço", "Banheiro", "Dormitório 1", "Dormitório 2", "Sacada"]);
	await shot("returned-to-type");

	await page.getByRole("button", { name: "Trocar tipologia" }).click();
	const change = page.getByRole("dialog", { name: "Trocar a tipologia da 903" });
	await expect(change.getByRole("radio", { name: /Tipologia B/ })).toBeVisible();
	await expect(change.getByRole("button", { name: "Trocar" })).toBeDisabled();
	await shot("change-type-dialog");
	await change.getByRole("radio", { name: /Sem tipologia/ }).click();
	await shot("change-type-dialog-chosen");
	await change.getByRole("button", { name: "Trocar" }).click();
	await expect(change).toBeHidden();
	await expect(page.getByText("Os cômodos desta unidade são só dela.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Voltar à tipologia" })).toBeHidden();
	await shot("unit-without-type");

	const area = (await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id WHERE p.name = 'Residencial Jardins' AND o.name = 'Construtora Horizonte' AND l.type = 'common_area' AND l.name = 'Salão de festas'"))[0].id;
	await page.goto(`/projects/${jardins}/locations/${area}`);
	await expect(page.getByRole("heading", { level: 1, name: "Salão de festas" })).toBeVisible();
	await shot("common-area");
	await page.getByRole("button", { name: "Adicionar cômodo" }).click();
	await page.getByLabel("Adicionar cômodo").fill("Banheiro");
	await page.getByLabel("Adicionar cômodo").press("Enter");
	await expect(page.getByText("Já existe o cômodo Banheiro nesta área comum.")).toBeVisible();
	await shot("common-area-name-taken");

	const vilaNova = await projectId("Residencial Vila Nova");
	const vilaUnit = (await query("SELECT u.id FROM location u JOIN project p ON p.id = u.project_id WHERE p.name = 'Residencial Vila Nova' AND u.type = 'unit' ORDER BY u.name LIMIT 1"))[0].id;
	await page.goto(`/projects/${vilaNova}/locations/${vilaUnit}`);
	await expect(page.getByText("A obra foi entregue: a estrutura não pode mais ser alterada.")).toBeVisible();
	await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
	await shot("delivered-unit");
}
