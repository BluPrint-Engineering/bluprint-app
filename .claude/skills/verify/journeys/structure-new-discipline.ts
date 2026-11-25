export default async function newDiscipline({ page, shot: rawShot, expect, query, accounts }) {
	const shot = async (name) => {
		await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
		await rawShot(name);
	};
	const jardins = (
		await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = 'Residencial Jardins' AND o.name = 'Construtora Horizonte'")
	)[0].id;
	const locationId = async (type, name, tower, floor) =>
		(await query("SELECT l.id FROM location l LEFT JOIN location parent ON parent.id = l.parent_id LEFT JOIN location grandparent ON grandparent.id = parent.parent_id WHERE l.project_id = $1 AND l.type = $2 AND l.name = $3 AND ($4::text IS NULL OR COALESCE(grandparent.name, parent.name) = $4) AND ($5::text IS NULL OR parent.name = $5)", [jardins, type, name, tower ?? null, floor ?? null]))[0].id;
	const disciplines = async (name) =>
		await query("SELECT id, name, type, applies_everywhere FROM discipline WHERE project_id = $1 AND name = $2", [jardins, name]);
	const extras = async () =>
		Number((await query("SELECT count(*) AS n FROM discipline WHERE project_id = $1 AND type = 'extra'", [jardins]))[0].n);
	const open = async (id, title) => {
		await page.goto(`/projects/${jardins}/locations/${id}`);
		await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
	};
	const newButton = page.getByRole("button", { name: "Nova disciplina" });
	const dialog = page.getByRole("dialog", { name: "Nova disciplina" });
	const nameField = dialog.getByLabel("Nome");
	const everywhere = dialog.getByRole("radio", { name: "Na obra toda" });
	const whereOn = dialog.getByRole("radio", { name: "Só onde for ligada" });
	const create = dialog.getByRole("button", { name: "Criar" });
	const box = (name) => page.getByRole("checkbox", { name });
	const limit = page.getByText("Esta obra já tem 10 disciplinas extras, o máximo.");

	const unit903 = await locationId("unit", "903", "Torre A", "9º andar");
	const ninth = await locationId("floor", "9º andar", "Torre A");
	expect(await extras(), "an earlier run left its disciplines: down and up before each device").toBe(2);
	await open(unit903, "903");
	await expect(page.getByText("3 de 4")).toBeVisible();
	await shot("card-with-button");

	await newButton.click();
	await expect(nameField).toBeFocused();
	await expect(everywhere).not.toBeChecked();
	await expect(whereOn).not.toBeChecked();
	await expect(create).toBeDisabled();
	await nameField.fill("Gesso");
	await expect(create).toBeDisabled();
	await shot("L13-no-choice");
	await everywhere.click();
	await expect(create).toBeEnabled();
	await shot("L13b-everywhere");
	await create.click();
	await expect(page.getByText("Disciplina Gesso criada.")).toBeVisible();
	await expect(dialog).toHaveCount(0);
	await expect(box("Gesso")).toBeChecked();
	await expect(page.getByText("4 de 5")).toBeVisible();
	await expect(newButton).toBeFocused();
	expect((await disciplines("Gesso")).map((row) => `${row.type}:${row.applies_everywhere}`)).toEqual(["extra:true"]);
	await shot("gesso-created-on-903");

	await open(ninth, "9º andar");
	await expect(box("Gesso")).not.toBeChecked();
	await shot("gesso-off-on-floor");

	const hall = await locationId("common_area", "Hall", "Torre A", "9º andar");
	await open(hall, "Hall");
	await newButton.click();
	await nameField.fill("Sauna");
	await whereOn.click();
	await shot("L13c-where-on");
	await create.click();
	await expect(page.getByText("Disciplina Sauna criada.")).toBeVisible();
	await expect(box("Sauna")).not.toBeChecked();
	expect((await disciplines("Sauna")).map((row) => `${row.type}:${row.applies_everywhere}`)).toEqual(["extra:false"]);
	await shot("sauna-off-on-hall");

	await open(hall, "Hall");
	await newButton.click();
	await nameField.fill("eletrica");
	await everywhere.click();
	await create.click();
	await expect(dialog.getByText("Elétrica já existe nesta obra.")).toBeVisible();
	await expect(nameField).toHaveValue("eletrica");
	await expect(everywhere).toBeChecked();
	await shot("L13d-name-taken");
	await nameField.fill("Geral");
	await create.click();
	await expect(dialog.getByText("Geral vale em todo local e não entra na lista.")).toBeVisible();
	await dialog.getByRole("button", { name: "Cancelar" }).click();
	await expect(dialog).toHaveCount(0);
	await expect(newButton).toBeFocused();
	expect(await disciplines("eletrica")).toEqual([]);

	const towerA = await locationId("tower", "Torre A");
	await open(towerA, "Torre A");
	await newButton.click();
	await nameField.fill("Impermeabilização");
	await everywhere.click();
	await page.context().clearCookies();
	await create.click();
	await expect(page).toHaveURL(/\/login\?redirect=/);
	await page.getByLabel("E-mail").fill(accounts.ADMIN_EMAIL);
	await page.getByLabel("Senha", { exact: true }).fill(accounts.SEED_PASSWORD);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(nameField).toHaveValue("Impermeabilização");
	await expect(everywhere).toBeChecked();
	await expect(page.getByRole("dialog")).toHaveCount(1);
	await shot("restored-after-login");
	await create.click();
	await expect(page.getByText("Disciplina Impermeabilização criada.")).toBeVisible();
	await expect(box("Impermeabilização")).not.toBeChecked();
	expect(await disciplines("Impermeabilização")).toHaveLength(1);

	await open(unit903, "903");
	for (const name of ["Forro", "Esquadrias", "Revestimento", "Ar-condicionado", "Gás"]) {
		await newButton.click();
		await nameField.fill(name);
		await whereOn.click();
		await create.click();
		await expect(page.getByText(`Disciplina ${name} criada.`)).toBeVisible();
		await expect(dialog).toHaveCount(0);
	}
	expect(await extras()).toBe(10);
	await expect(limit).toBeVisible();
	await expect(newButton).toHaveCount(0);
	await expect(page.getByRole("region", { name: "Disciplinas" })).toBeFocused();
	await open(unit903, "903");
	await expect(limit).toBeVisible();
	await shot("limit-reached");

	await open(ninth, "9º andar");
	await expect(limit).toBeVisible();
	await expect(newButton).toHaveCount(0);
	await shot("limit-on-floor");
}
