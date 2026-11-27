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
	const top = before;

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
	await expect(page.getByText(`A Torre B tem hoje do 1º ao ${top}º andar. Use andares que ela ainda não tem.`)).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Do andar", exact: true })).toHaveValue(String(top + 1));
	await expect(page.getByRole("textbox", { name: "Último andar", exact: true })).toHaveValue("");
	await expect(page.getByRole("textbox", { name: "Finais", exact: true })).toHaveValue("");
	await expect(page.getByRole("checkbox", { name: "Hall em cada andar" })).toBeChecked();
	await shot("a1-open");
	if (phone) {
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await shot("a1-open-end", { screenOnly: true });
	}

	await page.getByRole("textbox", { name: "Último andar", exact: true }).fill(String(top + 2));
	await page.getByRole("textbox", { name: "Finais", exact: true }).fill("01");
	if (phone) {
		await page.getByRole("button", { name: "Continuar · Tipologias" }).click();
		await page.getByRole("button", { name: "Continuar · Prévia" }).click();
	}
	await expect(page.getByText("Torre B ganha 2 andares e 2 unidades")).toBeVisible();
	await expect(page.getByText(/^Estes andares usam\s4 das \d+ que restam na reserva\. Depois de adicionar, sobram\s\d+\.$/)).toBeVisible();
	await expect(page.getByText("2 unidades + 2 halls de andar")).toBeVisible();
	await shot("a2-preview");
	if (phone) {
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await shot("a2-preview-end", { screenOnly: true });
	}

	await page.getByRole("button", { name: "Adicionar 2 andares" }).click();
	await expect(page.getByText("2 andares adicionados à Torre B.")).toBeVisible();
	await expect(page.getByRole("link", { name: `${top + 2}º andar` })).toBeVisible();
	await shot("w10-added");
	if ((await floorsOf()) !== before + 2) throw new Error(`Torre B has ${await floorsOf()} floors, expected ${before + 2}.`);

	await page.goto(`/projects/${jardins}/structure/new?tower=${towerB}`);
	await expect(page.getByRole("textbox", { name: "Do andar", exact: true })).toHaveValue(String(top + 3));
	await page.goto(`/projects/${jardins}/configuration`);
	await page.getByRole("region", { name: "Estrutura" }).getByRole("button", { name: "Assistente" }).click();
	await page.getByRole("menuitem", { name: "Adicionar andares à Torre B" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Adicionar andares à Torre B" })).toBeVisible();
	await shot("c1-assistant-to-add-floors");
}
