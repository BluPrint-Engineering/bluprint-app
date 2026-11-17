export default async function structureDuplicate({ page, shot, expect, query }) {
	const locationId = async (type, name, parent) =>
		(await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id WHERE p.name = 'Residencial Jardins' AND o.name = 'Construtora Horizonte' AND l.type = $1 AND l.name = $2 AND ($3::uuid IS NULL OR l.parent_id = $3)", [type, name, parent ?? null]))[0].id;
	const jardins = (await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = 'Residencial Jardins' AND o.name = 'Construtora Horizonte'"))[0].id;
	const unitsOf = async (parent) =>
		(await query("SELECT l.name FROM location l WHERE l.parent_id = $1 AND l.type = 'unit' ORDER BY l.position", [parent])).map((row) => row.name);
	const settle = () => page.waitForTimeout(300);
	const pageMenu = (name) => page.getByRole("button", { name, exact: true });
	const dialogOf = (name) => page.getByRole("dialog", { name });
	const field = () => page.getByRole("textbox", { name: "Nome" });
	const box = (name) => page.getByRole("checkbox", { name });
	const exceptions = async (id) =>
		(await query("SELECT d.name, ld.applies FROM location_discipline ld JOIN discipline d ON d.id = ld.discipline_id WHERE ld.location_id = $1 ORDER BY d.name", [id])).map((r) => `${r.name}:${r.applies}`);
	const exceptionsByName = async (parent) => {
		const byName = {};
		for (const row of await query("SELECT id, name FROM location WHERE parent_id = $1", [parent])) byName[row.name] = await exceptions(row.id);
		return byName;
	};
	const turn = async (name, on, id) => {
		await box(name).click();
		await expect(box(name)).toBeChecked({ checked: on });
		await expect.poll(async () => (await exceptions(id)).some((line) => line.startsWith(`${name}:`))).toBe(true);
	};

	const towerA = await locationId("tower", "Torre A");
	const towerB = await locationId("tower", "Torre B");
	const tenthB = await locationId("floor", "10º andar", towerB);
	const ninthA = await locationId("floor", "9º andar", towerA);

	await page.goto(`/projects/${jardins}/locations/${tenthB}`);
	await expect(page.getByRole("heading", { level: 1, name: "10º andar" })).toBeVisible();
	await turn("Hidráulica", false, tenthB);
	const tenthBUnits = await exceptionsByName(tenthB);
	await pageMenu("Ações do andar").click();
	await expect(page.getByRole("menuitem")).toHaveText(["Renomear andar", "Mover para cima", "Mover para baixo", "Duplicar andar", "Remover andar"]);
	await settle();
	await shot("floor-menu");
	await page.keyboard.press("Escape");
	await pageMenu("Ações do andar").click();
	await page.getByRole("menuitem", { name: "Duplicar andar" }).click();
	await expect(dialogOf("Duplicar o 10º andar")).toBeVisible();
	await expect(field()).toHaveValue("11º andar");
	await expect(page.getByText("Único na torre.")).toBeVisible();
	await expect(page.getByText(/^Usa 3 das \d+ unidades que restam nesta obra\. Depois, sobram\s\d+\.$/)).toBeVisible();
	await settle();
	await shot("r9a-duplicate-floor");
	await field().fill("9º andar");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Já existe o 9º andar na Torre B.")).toBeVisible();
	await settle();
	await shot("r7-duplicate-floor-name-taken");
	await field().fill("11º andar");
	await page.keyboard.press("Enter");
	await expect(dialogOf("Duplicar o 10º andar")).toHaveCount(0);
	await expect(page.getByText("11º andar criado.")).toBeVisible();
	const copy = await locationId("floor", "11º andar", towerB);
	expect(await unitsOf(copy)).toEqual(["1101", "1102"]);
	expect(await exceptions(copy)).toEqual(["Hidráulica:false"]);
	const copiedUnits = await exceptionsByName(copy);
	expect(copiedUnits["1101"]).toEqual(tenthBUnits["1001"]);
	expect(copiedUnits["1102"]).toEqual(tenthBUnits["1002"]);
	expect(copiedUnits.Hall).toEqual(tenthBUnits.Hall);

	await page.getByRole("link", { name: "Torre B", exact: true }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();
	const facade = page.getByRole("list", { name: "Fachada da Torre B" });
	await expect(facade.getByRole("listitem").first()).toContainText("11º");
	await expect(facade.getByRole("link", { name: "Unidade 1101" })).toBeVisible();
	await shot("t1-copied-floor-on-top");

	const unit903 = await locationId("unit", "903", ninthA);
	await page.goto(`/projects/${jardins}/locations/${unit903}`);
	await expect(page.getByRole("heading", { level: 1, name: "903" })).toBeVisible();
	await turn("Pintura", false, unit903);
	await turn("Piscina", true, unit903);
	await page.goto(`/projects/${jardins}/locations/${ninthA}`);
	await expect(page.getByRole("link", { name: /^903/ })).toContainText("3 alterações");
	const rooms = async (name) =>
		(await query("SELECT r.name, r.renamed, r.typology_room_id IS NOT NULL AS from_type FROM room r JOIN location l ON l.id = r.location_id WHERE l.name = $1 AND l.parent_id = $2 ORDER BY r.name", [name, ninthA]));
	const source = await rooms("903");
	await page.getByRole("button", { name: "Ações da unidade 903" }).click();
	await expect(page.getByRole("menuitem")).toHaveText(["Renomear", "Mover para cima", "Mover para baixo", "Duplicar unidade", "Remover unidade"]);
	await settle();
	await shot("unit-menu");
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Ações da unidade 903" }).click();
	await page.getByRole("menuitem", { name: "Duplicar unidade" }).click();
	await expect(dialogOf("Duplicar a unidade 903")).toBeVisible();
	await expect(field()).toHaveValue("905");
	await expect(field()).toHaveClass(/font-mono/);
	await expect(page.getByText(/^Usa 1 das \d+ unidades que restam nesta obra\. Depois, sobram\s\d+\.$/)).toBeVisible();
	await settle();
	await shot("r9a-duplicate-unit");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Unidade 905 criada.")).toBeVisible();
	await expect(page.getByRole("link", { name: /^905/ })).toContainText("3 alterações");
	expect(await rooms("905")).toEqual(source);
	expect(await exceptions(await locationId("unit", "905", ninthA))).toEqual(["Pintura:false", "Piscina:true"]);
	await shot("f1-copied-unit");

	await expect(page.getByText("Unidade 905 criada.")).toBeHidden({ timeout: 10000 });
	await page.getByRole("link", { name: "Torre A", exact: true }).click();
	await pageMenu("Ações da torre").click();
	await expect(page.getByRole("menuitem")).toHaveText(["Renomear torre", "Adicionar andares", "Adicionar área comum", "Duplicar torre", "Remover torre"]);
	await settle();
	await shot("t2-tower-menu");
	await page.keyboard.press("Escape");
	await pageMenu("Ações da torre").click();
	await page.getByRole("menuitem", { name: "Duplicar torre" }).click();
	await expect(dialogOf("Duplicar a Torre A")).toBeVisible();
	await expect(field()).toHaveValue("Torre C");
	await expect(page.getByRole("alert").filter({ hasText: /^Duplicar a Torre A usa 67 unidades e restam\s\d+\.\s*Alterar reserva$/ })).toBeVisible();
	await expect(page.getByRole("button", { name: "Duplicar", exact: true })).toBeDisabled();
	await settle();
	await shot("r9b-duplicate-tower-over");
	await page.getByRole("button", { name: "Cancelar" }).click();

	await page.goto(`/projects/${jardins}/locations/${towerB}`);
	await pageMenu("Ações da torre").click();
	await page.getByRole("menuitem", { name: "Duplicar torre" }).click();
	await expect(dialogOf("Duplicar a Torre B")).toBeVisible();
	await expect(field()).toHaveValue("Torre C");
	await expect(page.getByText(/^Usa 33 das \d+ unidades que restam nesta obra\. Depois, sobram\s\d+\.$/)).toBeVisible();
	await settle();
	await shot("r9a-duplicate-tower");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Torre C criada.")).toBeVisible();
	const towerC = await locationId("tower", "Torre C");
	const countOf = async (type, tower) =>
		(await query("SELECT count(*)::int AS n FROM location l WHERE l.type = $1 AND l.project_id = $2 AND ($3::uuid IS NULL OR l.id IN (SELECT id FROM location WHERE parent_id = $3 UNION SELECT c.id FROM location c JOIN location f ON f.id = c.parent_id WHERE f.parent_id = $3))", [type, jardins, tower]))[0].n;
	expect(await countOf("unit", towerC)).toBe(await countOf("unit", towerB));
	expect(await countOf("floor", towerC)).toBe(11);
	const towerExceptions = async (tower) =>
		(await query("SELECT coalesce(f.name, '') || '/' || l.name || ' ' || d.name || ':' || ld.applies AS line FROM location l LEFT JOIN location f ON f.id = l.parent_id AND f.type = 'floor' JOIN location_discipline ld ON ld.location_id = l.id JOIN discipline d ON d.id = ld.discipline_id WHERE l.id = $1 OR l.parent_id = $1 OR f.parent_id = $1", [tower])).map((row) => row.line.replace(/^\/(Torre [BC]) /, "/tower ")).sort();
	expect(await towerExceptions(towerC)).toEqual(await towerExceptions(towerB));
	expect(await towerExceptions(towerC)).toContain("/11º andar Hidráulica:false");

	await page.goto(`/projects/${jardins}`);
	await expect(page.getByRole("heading", { level: 2, name: "Torres" })).toBeVisible();
	await expect(page.getByRole("link", { name: /^Torre C/ })).toBeVisible();
	await shot("e2-three-towers");
}
