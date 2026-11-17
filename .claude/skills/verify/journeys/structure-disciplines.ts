export default async function disciplines({ page, shot: rawShot, expect, query }) {
	const shot = async (name) => {
		await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
		await rawShot(name);
	};
	const projectId = async (name) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const locationId = async (project, type, name, tower, floor) =>
		(await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id LEFT JOIN location parent ON parent.id = l.parent_id LEFT JOIN location grandparent ON grandparent.id = parent.parent_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte' AND l.type = $2 AND l.name = $3 AND ($4::text IS NULL OR COALESCE(grandparent.name, parent.name) = $4) AND ($5::text IS NULL OR parent.name = $5)", [project, type, name, tower ?? null, floor ?? null]))[0].id;
	const exceptions = async (id) =>
		(await query("SELECT d.name, ld.applies FROM location_discipline ld JOIN discipline d ON d.id = ld.discipline_id WHERE ld.location_id = $1 ORDER BY d.name", [id])).map((r) => `${r.name}:${r.applies}`);
	const box = (name) => page.getByRole("checkbox", { name });
	const open = async (project, id, title) => {
		await page.goto(`/projects/${project}/locations/${id}`);
		await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
	};

	const jardins = await projectId("Residencial Jardins");
	const unit903 = await locationId("Residencial Jardins", "unit", "903", "Torre A", "9º andar");
	const unit904 = await locationId("Residencial Jardins", "unit", "904", "Torre A", "9º andar");

	await open(jardins, unit903, "903");
	await expect(page.getByRole("heading", { level: 2, name: "Disciplinas" })).toBeVisible();
	await expect(page.getByText("3 de 4")).toBeVisible();
	await expect(box("Pintura")).toBeChecked();
	await expect(box("Piscina")).not.toBeChecked();
	await expect(page.getByText("Geral vale em todo local e não entra na lista. Pin novo aqui oferece Hidráulica, Elétrica e Pintura.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
	await shot("unit-all-on");

	await open(jardins, unit904, "904");
	await expect(page.getByText("2 de 4")).toBeVisible();
	await expect(box("Pintura")).not.toBeChecked();
	await shot("unit-without-pintura");

	await open(jardins, unit903, "903");
	await box("Pintura").click();
	await expect(page.getByText("2 de 4")).toBeVisible();
	expect(await exceptions(unit903)).toEqual(["Pintura:false"]);
	await shot("unit-pintura-turned-off");
	await box("Pintura").click();
	await expect(page.getByText("3 de 4")).toBeVisible();
	expect(await exceptions(unit903)).toEqual([]);

	for (const name of ["Hidráulica", "Elétrica", "Pintura"]) {
		await box(name).click();
		await expect(box(name)).not.toBeChecked();
	}
	await expect(page.getByText("0 de 4")).toBeVisible();
	await expect(page.getByText("Nenhuma disciplina específica ligada. Pin novo aqui, nem na Geral, só depois de ligar uma.")).toBeVisible();
	await shot("unit-none-on");
	for (const name of ["Hidráulica", "Elétrica", "Pintura"]) {
		await box(name).click();
		await expect(box(name)).toBeChecked();
	}
	await expect(page.getByText("3 de 4")).toBeVisible();
	expect(await exceptions(unit903)).toEqual([]);

	const hall = await locationId("Residencial Jardins", "common_area", "Hall", "Torre A", "9º andar");
	await open(jardins, hall, "Hall");
	await expect(page.getByText("3 de 4")).toBeVisible();
	await shot("common-area-hall");

	const salon = await locationId("Residencial Jardins", "common_area", "Salão de festas", "Torre A");
	await open(jardins, salon, "Salão de festas");
	await expect(page.getByText("4 de 4")).toBeVisible();
	await expect(box("Piscina")).toBeChecked();
	await shot("common-area-with-piscina");

	const ninth = await locationId("Residencial Jardins", "floor", "9º andar", "Torre A");
	await open(jardins, ninth, "9º andar");
	await expect(page.getByText("Esta lista vale só para o andar. As unidades e áreas comuns têm suas próprias listas.")).toBeVisible();
	await expect(page.getByText("2 de 4")).toBeVisible();
	await expect(box("Pintura")).not.toBeChecked();
	await shot("floor");
	await box("Elétrica").click();
	await expect(page.getByText("1 de 4")).toBeVisible();
	await expect(page.getByText("Desligada neste local.")).toHaveCount(3);
	await shot("floor-one-turned-off");
	await box("Elétrica").click();
	await expect(page.getByText("2 de 4")).toBeVisible();
	expect(await exceptions(ninth)).toEqual([]);

	const towerA = await locationId("Residencial Jardins", "tower", "Torre A");
	await open(jardins, towerA, "Torre A");
	await expect(page.getByText("Esta lista vale só para a torre. Os andares, unidades e áreas comuns têm suas próprias listas.")).toBeVisible();
	await expect(page.getByText("2 de 4")).toBeVisible();
	await shot("tower");

	const vilaNova = await projectId("Residencial Vila Nova");
	const vilaUnit = (await query("SELECT u.id FROM location u JOIN project p ON p.id = u.project_id WHERE p.name = 'Residencial Vila Nova' AND u.type = 'unit' ORDER BY u.name LIMIT 1"))[0].id;
	await page.goto(`/projects/${vilaNova}/locations/${vilaUnit}`);
	await expect(page.getByText("A obra foi entregue: a estrutura não pode mais ser alterada.")).toBeVisible();
	await expect(page.getByText("Hidráulica · ligada")).toBeVisible();
	await expect(page.getByRole("checkbox")).toHaveCount(0);
	await shot("delivered-unit");

	const vilaFloor = (await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id WHERE p.name = 'Residencial Vila Nova' AND l.type = 'floor' ORDER BY l.name LIMIT 1"))[0].id;
	await page.goto(`/projects/${vilaNova}/locations/${vilaFloor}`);
	await expect(page.getByText("Elétrica · ligada")).toBeVisible();
	await expect(page.getByRole("checkbox")).toHaveCount(0);
	await shot("delivered-floor");

	const vilaTower = (await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id WHERE p.name = 'Residencial Vila Nova' AND l.type = 'tower' ORDER BY l.name LIMIT 1"))[0].id;
	await page.goto(`/projects/${vilaNova}/locations/${vilaTower}`);
	await expect(page.getByText("Elétrica · ligada")).toBeVisible();
	await expect(page.getByRole("checkbox")).toHaveCount(0);
	await shot("delivered-tower");
}
