export default async function structureEdit({ page, shot, expect, query }) {
	const projectId = async (name) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const locationId = async (project, type, name) =>
		(await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte' AND l.type = $2 AND l.name = $3", [project, type, name]))[0].id;
	const stored = async (id) => (await query("SELECT name FROM location WHERE id = $1", [id]))[0]?.name;
	const phone = page.viewportSize().width < 768;
	const dialogOf = (name) => page.getByRole("dialog", { name });
	const settle = () => page.waitForTimeout(300);
	const pageMenu = (name) => page.getByRole("button", { name, exact: true });

	const galpao = await projectId("Galpão Logístico Sul");
	await page.goto(`/projects/${galpao}`);
	await page.getByRole("button", { name: "Adicionar uma torre por vez" }).click();
	await expect(page.getByRole("textbox", { name: "Nome da torre" })).toHaveValue("Torre A");
	await shot("e1-adding-tower");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("heading", { name: "A obra ainda não tem andares" })).toBeVisible();
	await expect(page.getByText("Torre A")).toHaveCount(0);
	await shot("e3-first-tower");

	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await page.getByRole("menuitem", { name: "Torre", exact: true }).click();
	await expect(page.getByRole("textbox", { name: "Nome da torre" })).toHaveValue("Torre B");
	await shot("e3-adding-second-tower");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("heading", { level: 2, name: "Torres" })).toBeVisible();
	await expect(page.getByRole("link", { name: /^Torre A/ })).toBeVisible();
	await expect(page.getByRole("link", { name: /^Torre B/ })).toBeVisible();
	await shot("e2-two-towers");

	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await expect(page.getByRole("menuitem")).toHaveText(["Torre", "Área comum da obra"]);
	await settle();
	await shot("e2-add-menu");
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await page.getByRole("menuitem", { name: "Área comum da obra" }).click();
	await page.getByRole("textbox", { name: "Adicionar área comum" }).fill("Guarita");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("link", { name: "Guarita" })).toBeVisible();
	await shot("e2-obra-common-area");

	const jardins = await projectId("Residencial Jardins");
	const floor = await locationId("Residencial Jardins", "floor", "9º andar");
	await page.goto(`/projects/${jardins}/locations/${floor}`);
	await expect(page.getByRole("button", { name: "Adicionar unidade" })).toBeVisible();
	await shot("f2-floor-with-add-rows");
	await page.getByRole("button", { name: "Adicionar unidade" }).click();
	const field = page.getByRole("textbox", { name: "Adicionar unidade" });
	await expect(field).toHaveValue("905");
	await expect(page.getByText(/^Usa 1 d(as \d+ unidades que restam|a única unidade que resta) nesta obra\.$/)).toBeVisible();
	await shot("f3-adding-unit");
	await field.fill("903");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("alert").filter({ hasText: "Já existe a unidade 903 na Torre A." })).toBeVisible();
	await shot("f4-name-taken");
	await field.fill("905");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("link", { name: /^905/ })).toBeVisible();
	await expect(page.getByText("Andar · Torre A · 5 unidades")).toBeVisible();
	expect(await query("SELECT count(*)::int AS n FROM location WHERE name = '905' AND type = 'unit' AND project_id = $1", [jardins])).toEqual([{ n: 1 }]);
	await shot("f3-unit-added");

	await page.getByRole("button", { name: "Adicionar unidade" }).click();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("textbox", { name: "Adicionar unidade" })).toHaveCount(0);
	await page.getByRole("button", { name: "Adicionar área comum" }).click();
	await page.getByRole("textbox", { name: "Adicionar área comum" }).fill("Terraço");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("link", { name: "Terraço" })).toBeVisible();

	await page.getByRole("button", { name: "Ações da unidade 905" }).click();
	await expect(page.getByRole("menuitem")).toHaveText(["Renomear", "Mover para cima", "Mover para baixo", "Remover unidade"]);
	await settle();
	await shot("f1b-unit-menu");
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Ações da unidade 905" }).click();
	await page.getByRole("menuitem", { name: "Renomear" }).click();
	await expect(dialogOf("Renomear a unidade")).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Nome" })).toHaveValue("905");
	await expect(page.getByText("Único na torre.")).toBeVisible();
	await shot("r6-rename-unit");
	await page.getByRole("textbox", { name: "Nome" }).fill(" 903 ");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("alert").filter({ hasText: "Já existe a unidade 903 na Torre A." })).toBeVisible();
	await shot("r7-rename-taken");
	await page.getByRole("textbox", { name: "Nome" }).fill("905A");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("link", { name: /^905A/ })).toBeVisible();
	await expect(dialogOf("Renomear a unidade")).toHaveCount(0);

	await page.getByRole("link", { name: "Torre A" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre A" })).toBeVisible();
	await shot("t1-tower-page-menu");
	await pageMenu("Ações da torre").click();
	await expect(page.getByRole("menuitem")).toHaveText(["Renomear torre", "Adicionar área comum", "Remover torre"]);
	await settle();
	await shot("t2-tower-menu");
	await page.keyboard.press("Escape");
	await pageMenu("Ações da torre").click();
	await page.getByRole("menuitem", { name: "Adicionar área comum" }).click();
	await expect(page.getByRole("textbox", { name: "Adicionar área comum" })).toBeFocused();
	await page.keyboard.press("Escape");
	await pageMenu("Ações da torre").click();
	await page.getByRole("menuitem", { name: "Renomear torre" }).click();
	await expect(dialogOf("Renomear a torre")).toBeVisible();
	await expect(page.getByText("Único na obra.")).toBeVisible();
	await page.getByRole("textbox", { name: "Nome" }).fill("Torre Azul");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("heading", { level: 1, name: "Torre Azul" })).toBeVisible();
	expect(await stored(await locationId("Residencial Jardins", "tower", "Torre Azul"))).toBe("Torre Azul");
	await shot("tower-renamed");

	const delivered = await projectId("Residencial Vila Nova");
	await page.goto(`/projects/${delivered}`);
	await expect(page.getByText("A obra foi entregue: a estrutura não pode mais ser alterada.")).toBeVisible();
	await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
	await shot("delivered-read-only");
	if (phone) await shot("phone-done");
}
