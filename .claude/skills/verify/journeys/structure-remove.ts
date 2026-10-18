export default async function structureRemove({ page, shot, expect, query }) {
	const jardins = (await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = 'Residencial Jardins' AND o.name = 'Construtora Horizonte'"))[0].id;
	const floorOf = async (tower, name) =>
		(await query("SELECT f.id FROM location f JOIN location t ON t.id = f.parent_id WHERE f.project_id = $1 AND t.name = $2 AND f.type = 'floor' AND f.name = $3", [jardins, tower, name]))[0].id;
	const towerOf = async (name) =>
		(await query("SELECT id FROM location WHERE project_id = $1 AND type = 'tower' AND name = $2", [jardins, name]))[0].id;
	const unitCount = async () => (await query("SELECT count(*)::int AS n FROM location WHERE project_id = $1 AND type = 'unit'", [jardins]))[0].n;
	const floorsOf = async (tower) =>
		(await query("SELECT f.name FROM location f JOIN location t ON t.id = f.parent_id WHERE f.project_id = $1 AND t.name = $2 AND f.type = 'floor' ORDER BY f.position, f.id", [jardins, tower])).map((row) => row.name);
	const unitsOnFloor = async (floor) =>
		(await query("SELECT name FROM location WHERE parent_id = $1 AND type = 'unit' ORDER BY position, id", [floor])).map((row) => row.name);
	const settle = () => page.waitForTimeout(300);
	const unitButtons = () =>
		page.getByRole("button", { name: /^Ações da unidade / }).evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label").replace("Ações da unidade ", "")));
	const menu = (name) => page.getByRole("button", { name, exact: true });
	const items = (labels) => expect(page.getByRole("menuitem")).toHaveText(labels);

	const ninthA = await floorOf("Torre A", "9º andar");
	await page.goto(`/projects/${jardins}/locations/${ninthA}`);
	await expect.poll(unitButtons).toEqual(["901", "902", "903", "904"]);

	await menu("Ações da unidade 902").click();
	await items(["Renomear", "Mover para cima", "Mover para baixo", "Remover unidade"]);
	await settle();
	await shot("f1c-unit-menu");
	await page.keyboard.press("Escape");
	await menu("Ações da unidade 902").click();
	await page.getByRole("menuitem", { name: "Mover para cima" }).click();
	await expect.poll(unitButtons).toEqual(["902", "901", "903", "904"]);
	expect(await unitsOnFloor(ninthA)).toEqual(["902", "901", "903", "904"]);
	await shot("move-unit-up");
	await menu("Ações da unidade 902").click();
	await page.getByRole("menuitem", { name: "Mover para cima" }).click();
	await page.waitForTimeout(500);
	expect(await unitsOnFloor(ninthA)).toEqual(["902", "901", "903", "904"]);
	await menu("Ações da unidade 902").click();
	await page.getByRole("menuitem", { name: "Mover para baixo" }).click();
	await expect.poll(unitButtons).toEqual(["901", "902", "903", "904"]);
	expect(await unitsOnFloor(ninthA)).toEqual(["901", "902", "903", "904"]);

	const unit903 = (await query("SELECT id FROM location WHERE parent_id = $1 AND name = '903'", [ninthA]))[0].id;
	const detail = async () =>
		(await query("SELECT l.unit_type_id, l.position, (SELECT count(*)::int FROM room r WHERE r.location_id = l.id) AS rooms, (SELECT count(*)::int FROM dropped_room d WHERE d.location_id = l.id) AS dropped, (SELECT count(*)::int FROM room r WHERE r.location_id = l.id AND r.renamed) AS renamed FROM location l WHERE l.id = $1", [unit903]))[0];
	const before = await detail();
	const used = await unitCount();
	expect(before.dropped).toBe(1);
	await expect(page.getByRole("link", { name: /^903.*3 alterações/ })).toBeVisible();

	await menu("Ações da unidade 903").click();
	await page.getByRole("menuitem", { name: "Remover unidade" }).click();
	await expect(page.getByText("Unidade 903 excluída.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Desfazer" })).toBeVisible();
	await expect(page.getByRole("alertdialog")).toHaveCount(0);
	await expect(menu("Ações da unidade 903")).toHaveCount(0);
	expect(await unitCount()).toBe(used - 1);
	await settle();
	await shot("r1-unit-deleted");
	await page.getByRole("button", { name: "Desfazer" }).click();
	await expect(menu("Ações da unidade 903")).toBeVisible();
	await expect(page.getByRole("link", { name: /^903.*3 alterações/ })).toBeVisible();
	expect(await unitCount()).toBe(used);
	expect(await detail()).toEqual(before);
	expect(await unitsOnFloor(ninthA)).toEqual(["901", "902", "903", "904"]);
	await shot("r1-unit-undone");

	await menu("Ações da área comum Hall").click();
	await page.getByRole("menuitem", { name: "Remover área comum" }).click();
	await expect(page.getByText("Área comum Hall excluída.")).toBeVisible();
	await settle();
	await shot("r1-common-area-deleted");
	await page.getByRole("button", { name: "Desfazer" }).click();
	await expect(menu("Ações da área comum Hall")).toBeVisible();

	await menu("Ações do andar").click();
	await items(["Renomear andar", "Mover para cima", "Mover para baixo", "Remover andar"]);
	await page.getByRole("menuitem", { name: "Mover para cima" }).click();
	await expect.poll(async () => { const names = await floorsOf("Torre A"); return names.indexOf("9º andar") > names.indexOf("10º andar"); }).toBe(true);
	await menu("Ações do andar").click();
	await page.getByRole("menuitem", { name: "Mover para baixo" }).click();
	await expect.poll(async () => { const names = await floorsOf("Torre A"); return names.indexOf("9º andar") < names.indexOf("10º andar"); }).toBe(true);

	const tenthB = await floorOf("Torre B", "10º andar");
	await page.goto(`/projects/${jardins}/locations/${tenthB}`);
	const usedBeforeFloor = await unitCount();
	await menu("Ações do andar").click();
	await page.getByRole("menuitem", { name: "Remover andar" }).click();
	const dialog = page.getByRole("alertdialog");
	await expect(dialog.getByRole("heading", { name: "Excluir o 10º andar?" })).toBeVisible();
	await expect(dialog.getByText("O 10º andar não tem pins, plantas nem dados. As 2 unidades e a área comum dele também são excluídas.")).toBeVisible();
	await expect(dialog.getByText("As 2 unidades voltam para a reserva da obra.")).toBeVisible();
	await settle();
	await shot("r2-confirm-floor");
	await dialog.getByRole("button", { name: "Excluir" }).click();
	await expect(page.getByText("10º andar excluído.")).toBeVisible();
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
	expect(await unitCount()).toBe(usedBeforeFloor - 2);
	expect((await floorsOf("Torre B")).includes("10º andar")).toBe(false);
	await settle();
	await shot("r2-floor-deleted");

	await page.setViewportSize({ width: page.viewportSize().width, height: 1600 });
	await menu("Ações da torre").click();
	await items(["Renomear torre", "Adicionar andares", "Adicionar área comum", "Remover torre"]);
	await settle();
	await shot("t2-tower-menu-remove");
	await page.getByRole("menuitem", { name: "Remover torre" }).click();
	await expect(dialog.getByRole("heading", { name: "Excluir a Torre B?" })).toBeVisible();
	await expect(dialog.getByText(/^A Torre B não tem pins, plantas nem dados\. Os 9 andares, as 18 unidades e as 9 áreas comuns dela também são excluídos\.$/)).toBeVisible();
	await settle();
	await shot("r2-confirm-tower");
	await dialog.getByRole("button", { name: "Cancelar" }).click();
	await expect(dialog).toHaveCount(0);
	expect(await towerOf("Torre B")).toBeTruthy();
}
