export default async function disciplineBatch({ page, shot: rawShot, expect, query }) {
	const shot = async (name) => {
		await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
		await rawShot(name);
	};
	const jardins = (
		await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = 'Residencial Jardins' AND o.name = 'Construtora Horizonte'")
	)[0].id;
	const locationId = async (type, name, tower, floor) =>
		(await query("SELECT l.id FROM location l LEFT JOIN location parent ON parent.id = l.parent_id LEFT JOIN location grandparent ON grandparent.id = parent.parent_id WHERE l.project_id = $1 AND l.type = $2 AND l.name = $3 AND ($4::text IS NULL OR COALESCE(grandparent.name, parent.name) = $4) AND ($5::text IS NULL OR parent.name = $5)", [jardins, type, name, tower ?? null, floor ?? null]))[0].id;
	const exceptionsUnder = async (parentId) =>
		await query("SELECT l.name AS location, d.name AS discipline, ld.applies FROM location_discipline ld JOIN location l ON l.id = ld.location_id JOIN discipline d ON d.id = ld.discipline_id WHERE l.parent_id = $1 ORDER BY l.name, d.name", [parentId]);
	const exceptionsOf = async (id) =>
		await query("SELECT d.name AS discipline, ld.applies FROM location_discipline ld JOIN discipline d ON d.id = ld.discipline_id WHERE ld.location_id = $1 ORDER BY d.name", [id]);
	const open = async (id, title) => {
		await page.goto(`/projects/${jardins}/locations/${id}`);
		await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
	};
	const dialog = page.getByRole("dialog", { name: "Disciplinas em lote" });
	const box = (scope, name) => scope.getByRole("checkbox", { name, exact: true });
	const apply = (count) => dialog.getByRole("button", { name: `Aplicar a ${count} ${count === 1 ? "local" : "locais"}` });

	await query("START TRANSACTION READ WRITE");
	await query("DELETE FROM location_discipline WHERE discipline_id IN (SELECT id FROM discipline WHERE project_id = $1 AND name = 'Selagem')", [jardins]);
	await query("DELETE FROM discipline WHERE project_id = $1 AND name = 'Selagem'", [jardins]);
	await query("COMMIT");

	const ninth = await locationId("floor", "9º andar", "Torre A");
	const leaves = await query("SELECT name FROM location WHERE parent_id = $1 ORDER BY name", [ninth]);
	const count = leaves.length;
	const floorBefore = await exceptionsOf(ninth);
	const towerA = await locationId("tower", "Torre A");
	const towerBefore = await exceptionsOf(towerA);

	await open(ninth, "9º andar");
	const opener = page.getByRole("button", { name: "Aplicar às unidades e áreas comuns" });
	await expect(opener).toBeEnabled();
	await opener.click();
	await expect(dialog.getByRole("radio", { name: "Um andar" })).toBeChecked();
	await expect(dialog.getByRole("combobox", { name: "Torre" })).toHaveValue(towerA);
	await expect(dialog.getByRole("combobox", { name: "Andar" })).toHaveValue(ninth);
	await expect(apply(count)).toBeEnabled();
	await expect(dialog.getByText("O lote muda as unidades e áreas comuns dali. A lista do próprio andar ou torre não muda.")).toBeVisible();
	await shot("L6-batch-from-floor");
	await box(dialog, "Hidráulica").click();
	await box(dialog, "Pintura").click();
	await shot("L6-batch-boxes-changed");
	await apply(count).click();
	await expect(page.getByText(`Disciplinas aplicadas a ${count} locais.`)).toBeVisible();
	await expect(dialog).toHaveCount(0);
	await expect(opener).toBeFocused();
	const afterBatch = await exceptionsUnder(ninth);
	for (const { name } of leaves) {
		const rows = afterBatch.filter((row) => row.location === name);
		expect(rows.filter((row) => row.discipline === "Hidráulica").map((row) => row.applies)).toEqual([false]);
		expect(rows.filter((row) => row.discipline === "Pintura").map((row) => row.applies)).toEqual([false]);
		expect(rows.filter((row) => row.discipline === "Elétrica")).toEqual([]);
	}
	expect(await exceptionsOf(ninth)).toEqual(floorBefore);
	expect(await exceptionsOf(towerA)).toEqual(towerBefore);
	await expect(page.getByRole("checkbox", { name: "Hidráulica" })).toBeChecked();
	await shot("L15-floor-after-batch");

	const unit903 = await locationId("unit", "903", "Torre A", "9º andar");
	await open(unit903, "903");
	await expect(page.getByRole("checkbox", { name: "Hidráulica" })).not.toBeChecked();
	await expect(page.getByRole("checkbox", { name: "Elétrica" })).toBeChecked();
	await expect(page.getByRole("checkbox", { name: "Pintura" })).not.toBeChecked();
	await shot("L15-unit-after-batch");

	const salao = await locationId("common_area", "Salão de festas", "Torre A");
	await open(salao, "Salão de festas");
	await page.getByRole("button", { name: "Aplicar a outros locais" }).click();
	await expect(dialog.getByRole("radio", { name: "Locais" })).toBeChecked();
	await expect(box(dialog, "Salão de festas · este local")).toBeChecked();
	await expect(apply(1)).toBeEnabled();
	await shot("L6-este-local-row");
	await dialog.getByRole("button", { name: "Cancelar" }).click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Aplicar a outros locais" })).toBeFocused();

	await open(unit903, "903");
	await page.getByRole("button", { name: "Aplicar a outros locais" }).click();
	await expect(dialog.getByRole("radio", { name: "Locais" })).toBeChecked();
	await expect(box(dialog, "903")).toBeChecked();
	await expect(apply(1)).toBeEnabled();
	await box(dialog, "902").click();
	await expect(apply(2)).toBeEnabled();
	await shot("batch-from-unit");
	await dialog.getByRole("button", { name: "Nova disciplina" }).click();
	const creating = page.getByRole("dialog", { name: "Nova disciplina" });
	await creating.getByLabel("Nome").fill("Selagem");
	await creating.getByRole("radio", { name: "Só onde for ligada" }).click();
	await shot("create-over-batch");
	await creating.getByRole("button", { name: "Criar" }).click();
	await expect(page.getByText("Disciplina Selagem criada.")).toBeVisible();
	await expect(creating).toHaveCount(0);
	await expect(box(dialog, "Selagem")).toBeChecked();
	await expect(box(dialog, "902")).toBeChecked();
	await expect(box(dialog, "903")).toBeChecked();
	await expect(apply(2)).toBeEnabled();
	await expect(dialog.getByRole("button", { name: "Nova disciplina" })).toBeFocused();
	await shot("back-in-batch-with-new");
	await dialog.getByRole("button", { name: "Cancelar" }).click();
	await expect(dialog).toHaveCount(0);
}
