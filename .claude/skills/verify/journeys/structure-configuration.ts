export default async function structureConfiguration({ page, shot, expect, query }) {
	const locked = "A obra foi entregue: a estrutura não pode mais ser alterada.";
	const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
	const projectId = async (name) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const count = async (id, type) =>
		(await query("SELECT count(*)::int AS n FROM location WHERE project_id = $1 AND type = $2", [id, type]))[0].n;
	const section = (name) => page.getByRole("region", { name });
	const menu = async (typeName, item) => {
		await page.getByRole("button", { name: `Ações da ${typeName}` }).click();
		await page.getByRole("menuitem", { name: item }).click();
	};

	const jardins = await projectId("Residencial Jardins");
	await page.goto(`/projects/${jardins}/configuration`);
	const estrutura = section("Estrutura");
	const tipologias = section("Tipologias");
	await expect(estrutura.getByRole("heading", { level: 3, name: "Estrutura" })).toBeVisible();
	const summary = [
		plural(await count(jardins, "tower"), "torre", "torres"),
		plural(await count(jardins, "floor"), "andar", "andares"),
		plural(await count(jardins, "unit"), "unidade", "unidades"),
		plural(await count(jardins, "common_area"), "área comum", "áreas comuns"),
	].join(" · ");
	await expect(estrutura.getByText(summary)).toBeVisible();
	await expect(estrutura.getByRole("link", { name: "Abrir estrutura" })).toBeVisible();
	await expect(estrutura.getByRole("link", { name: "Assistente" })).toHaveCount(0);
	await expect(tipologias.getByRole("button", { name: "Nova tipologia" })).toBeVisible();
	await shot("c1-sections");

	const unitsOf = async (typeName) =>
		(await query("SELECT count(*)::int AS n FROM location l JOIN unit_type t ON t.id = l.unit_type_id WHERE t.project_id = $1 AND t.name = $2", [jardins, typeName]))[0].n;
	const roomsOf = async (typeName) =>
		(await query("SELECT count(*)::int AS n FROM unit_type_room r JOIN unit_type t ON t.id = r.unit_type_id WHERE t.project_id = $1 AND t.name = $2", [jardins, typeName]))[0].n;
	const unitsA = await unitsOf("Tipologia A");
	await expect(tipologias.getByText(`${plural(await roomsOf("Tipologia A"), "cômodo", "cômodos")} · ${plural(unitsA, "unidade", "unidades")}`)).toBeVisible();
	await page.getByRole("button", { name: "Ações da Tipologia A" }).click();
	await expect(page.getByRole("menuitem", { name: "Excluir (só sem unidades)" })).toHaveAttribute("aria-disabled", "true");
	await shot("menu-in-use");
	await page.keyboard.press("Escape");

	await menu("Tipologia A", "Editar cômodos");
	await expect(page.getByRole("textbox", { name: "Novo cômodo" })).toBeVisible();
	await expect(page.getByText(/^Salvar muda as \d+ unidades da Tipologia A\./)).toBeVisible();
	await shot("c2-editing");
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Lavanderia");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText("A tipologia não pode ter o cômodo Lavanderia: uma unidade já tem um cômodo com esse nome.")).toBeVisible();
	await shot("c2-name-clash");
	await page.getByRole("button", { name: "Tirar Lavanderia" }).click();
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Despensa");
	await page.keyboard.press("Enter");
	await shot("c2-room-added");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText(`Tipologia A salva. ${plural(unitsA, "unidade atualizada", "unidades atualizadas")}.`)).toBeVisible();
	await shot("c2-saved");
	const withRoom = (await query("SELECT count(*)::int AS n FROM location l JOIN unit_type t ON t.id = l.unit_type_id JOIN room r ON r.location_id = l.id WHERE t.project_id = $1 AND t.name = 'Tipologia A' AND r.name = 'Despensa' AND r.unit_type_room_id IS NOT NULL", [jardins]))[0].n;
	expect(withRoom).toBe(unitsA);

	await menu("Duplex", "Renomear");
	await expect(page.getByRole("dialog", { name: "Renomear a tipologia" })).toBeVisible();
	await shot("rename-open");
	await page.getByRole("textbox", { name: "Nome" }).fill("tipologia a");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Já existe a tipologia tipologia a nesta obra.")).toBeVisible();
	await shot("rename-taken");
	await page.getByRole("textbox", { name: "Nome" }).fill("Duplex Cobertura");
	await page.keyboard.press("Enter");
	await expect(tipologias.getByText("Duplex Cobertura")).toBeVisible();

	await tipologias.getByRole("button", { name: "Nova tipologia" }).click();
	await page.getByRole("textbox", { name: "Nome" }).fill("Studio");
	await shot("create-open");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("textbox", { name: "Novo cômodo" })).toBeVisible();
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Sala");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText("Studio salva.")).toBeVisible();
	await menu("Studio", "Excluir tipologia");
	await expect(page.getByText("Studio excluída.")).toBeVisible();
	await expect(tipologias.getByText("Studio")).toHaveCount(0);
	await shot("deleted");

	await page.goto(`/projects/${await projectId("Galpão Logístico Sul")}/configuration`);
	await expect(section("Estrutura").getByText("A obra ainda não tem estrutura.")).toBeVisible();
	await expect(section("Estrutura").getByRole("link", { name: "Montar estrutura" })).toBeVisible();
	await expect(section("Tipologias").getByText("Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.")).toBeVisible();
	await shot("c5-no-structure");

	await page.goto(`/projects/${await projectId("Residencial Vila Nova")}/configuration`);
	await expect(section("Estrutura").getByRole("link", { name: "Abrir estrutura" })).toBeVisible();
	await expect(section("Estrutura").getByRole("link", { name: "Assistente" })).toHaveCount(0);
	await expect(section("Estrutura").getByText(locked)).toBeVisible();
	await expect(section("Tipologias").getByText(locked)).toBeVisible();
	await expect(section("Tipologias").getByRole("button")).toHaveCount(0);
	await shot("c6-delivered");

	await page.goto(`/projects/${await projectId("Condomínio Bela Vista")}/configuration`);
	await expect(section("Estrutura").getByRole("link", { name: "Montar estrutura" })).toHaveCount(0);
	await expect(section("Estrutura").getByText(locked)).toBeVisible();
	await shot("c6-delivered-no-structure");
}
