export default async function structureAddFloors({ page, shot, expect, query }) {
	const projectId = async (name) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const locationId = async (project, type, name) =>
		(await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte' AND l.type = $2 AND l.name = $3", [project, type, name]))[0].id;
	const phone = page.viewportSize().width < 768;

	const jardins = await projectId("Residencial Jardins");
	const towerB = await locationId("Residencial Jardins", "tower", "Torre B");
	const floorsOf = async () =>
		(await query("SELECT count(*)::int AS n FROM location WHERE parent_id = $1 AND type = 'floor'", [towerB]))[0].n;
	const before = await floorsOf();

	await page.goto(`/projects/${jardins}/locations/${towerB}`);
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();
	if (phone) {
		await expect(page.getByRole("link", { name: "Adicionar andares" })).toHaveCount(0);
		await page.getByRole("button", { name: "Ações da torre", exact: true }).click();
		await page.waitForTimeout(300);
		await shot("t2-tower-menu");
		await page.getByRole("menuitem", { name: "Adicionar andares" }).click();
	} else {
		await shot("t1-tower-with-add-floors");
		await page.getByRole("link", { name: "Adicionar andares" }).click();
	}

	await expect(page.getByRole("heading", { level: 1, name: "Adicionar andares à Torre B" })).toBeVisible();
	await expect(page.getByText(/^A Torre B tem hoje \d+ andares, do 1º ao 10º, com 2 unidades por andar\.$/)).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Do andar", exact: true })).toHaveValue("11");
	await expect(page.getByRole("textbox", { name: "Unidades por andar" })).toHaveValue("2");
	await shot("w9-add-floors");

	await page.getByRole("textbox", { name: "Último andar" }).fill("12");
	if (phone) {
		await page.getByRole("button", { name: "Continuar · Áreas comuns" }).click();
		await page.getByRole("button", { name: "Continuar · Tipologias" }).click();
		await page.getByRole("button", { name: "Continuar · Prévia" }).click();
	}
	await expect(page.getByText("Torre B ganha 2 andares e 4 unidades")).toBeVisible();
	await expect(page.getByText(/^Usa 4 das \d+ unidades que restam nesta obra\. Depois de adicionar, sobram\s\d+\.$/)).toBeVisible();
	await shot("w9-preview");

	await page.getByRole("button", { name: "Adicionar 2 andares" }).click();
	await expect(page.getByText("2 andares adicionados à Torre B.")).toBeVisible();
	await expect(page.getByRole("link", { name: "12º andar" })).toBeVisible();
	await shot("w10-added");
	if ((await floorsOf()) !== before + 2) throw new Error(`Torre B has ${await floorsOf()} floors, expected ${before + 2}.`);

	await page.goto(`/projects/${jardins}/structure/new?tower=${towerB}`);
	await expect(page.getByRole("textbox", { name: "Do andar", exact: true })).toHaveValue("13");
	await page.goto(`/projects/${jardins}/configuration`);
	await page.getByRole("region", { name: "Estrutura" }).getByRole("button", { name: "Assistente" }).click();
	await page.getByRole("menuitem", { name: "Adicionar andares à Torre B" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Adicionar andares à Torre B" })).toBeVisible();
	await shot("c1-assistant-to-add-floors");
}
