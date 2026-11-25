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
	await expect(estrutura.getByRole("button", { name: "Assistente" })).toBeVisible();
	await expect(tipologias.getByRole("button", { name: "Nova tipologia", exact: true })).toBeVisible();
	await expect(tipologias.getByRole("button", { name: "Nova tipologia de área comum" })).toBeVisible();
	await shot("c1-sections");

	const unitsOf = async (typeName) =>
		(await query("SELECT count(*)::int AS n FROM location l JOIN typology t ON t.id = l.typology_id WHERE t.project_id = $1 AND t.name = $2", [jardins, typeName]))[0].n;
	const roomsOf = async (typeName) =>
		(await query("SELECT count(*)::int AS n FROM typology_room r JOIN typology t ON t.id = r.typology_id WHERE t.project_id = $1 AND t.name = $2", [jardins, typeName]))[0].n;
	const unitsA = await unitsOf("Tipologia A");
	await expect(tipologias.getByText(`${plural(await roomsOf("Tipologia A"), "cômodo", "cômodos")} · ${plural(unitsA, "unidade", "unidades")}`)).toBeVisible();
	await expect(tipologias.getByText(`3 cômodos · ${plural(await unitsOf("Hall padrão"), "área comum", "áreas comuns")}`)).toBeVisible();
	const unidades = tipologias.getByRole("region", { name: "Unidades" });
	const areas = tipologias.getByRole("region", { name: "Áreas comuns" });
	await expect(unidades.getByText("4 tipologias")).toBeVisible();
	await expect(areas.getByText("3 tipologias")).toBeVisible();
	await expect(tipologias.getByRole("button", { name: /^Duplex/ }).getByText("Sem uso")).toBeVisible();
	await expect(tipologias.getByRole("button", { name: /^Corredor/ }).getByText("Sem uso")).toBeVisible();
	await expect(tipologias.getByText("Sem uso")).toHaveCount(2);
	await page.getByRole("button", { name: "Ações da Tipologia A" }).click();
	await expect(page.getByRole("menuitem", { name: "Excluir (só sem uso)" })).toHaveAttribute("aria-disabled", "true");
	await shot("menu-in-use");
	await page.keyboard.press("Escape");

	await tipologias.getByRole("button", { name: /^Tipologia B/ }).click();
	await tipologias.getByRole("button", { name: /^Hall padrão/ }).click();
	await expect(tipologias.getByRole("button", { expanded: true })).toHaveCount(2);
	await expect(tipologias.getByRole("listitem").filter({ hasText: /^Banheiro social$/ })).toBeVisible();
	await expect(tipologias.getByRole("listitem").filter({ hasText: /^Elevadores$/ })).toBeVisible();
	await page.waitForTimeout(200);
	await shot("c2-open-rows");
	await tipologias.getByRole("button", { name: /^Tipologia B/ }).click();
	await tipologias.getByRole("button", { name: /^Hall padrão/ }).click();

	const search = tipologias.getByRole("textbox", { name: "Buscar tipologia" });
	await search.fill("HÁLL");
	await expect(unidades.getByText("Nenhuma tipologia com esse nome.")).toBeVisible();
	await expect(areas.getByRole("button", { name: /^Hall padrão/ })).toBeVisible();
	await expect(areas.getByRole("button", { name: /^Corredor/ })).toHaveCount(0);
	await expect(unidades.getByText("4 tipologias")).toBeVisible();
	await expect(tipologias.getByRole("button", { name: /^Nova tipologia/ })).toHaveCount(0);
	await shot("c5-search");
	await tipologias.getByRole("button", { name: "Limpar busca" }).click();
	await expect(search).toHaveValue("");

	await menu("Tipologia A", "Editar cômodos");
	await expect(page.getByRole("textbox", { name: "Novo cômodo" })).toBeVisible();
	await expect(page.getByText(/^Salvar muda as \d+ unidades da Tipologia A\. Um local com alterações mantém o que foi mudado nele\.$/)).toBeVisible();
	await page.getByRole("button", { name: "Ações da Tipologia B" }).click();
	await expect(page.getByRole("menuitem", { name: "Editar cômodos" })).toHaveAttribute("aria-disabled", "true");
	await expect(page.getByRole("menuitem", { name: "Renomear" })).not.toHaveAttribute("aria-disabled");
	await page.keyboard.press("Escape");
	await expect(tipologias.getByRole("button", { name: "Nova tipologia", exact: true })).toHaveAttribute("aria-disabled", "true");
	await expect(tipologias.getByRole("button", { name: "Nova tipologia de área comum" })).toHaveAttribute("aria-disabled", "true");
	await shot("c4-editing");
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Sála");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Esse cômodo já está na tipologia.")).toBeVisible();
	await shot("c4-accent-duplicate");
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Lavanderia");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText("A tipologia não pode ter o cômodo Lavanderia: uma unidade já tem um cômodo com esse nome.")).toBeVisible();
	await shot("c4-name-clash");
	await page.getByRole("button", { name: "Tirar Lavanderia" }).click();
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Despensa");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("listitem").filter({ hasText: "Despensa" }).getByText("Novo", { exact: true })).toBeVisible();
	await shot("c4-room-added");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText(`Tipologia A salva. ${plural(unitsA, "unidade atualizada", "unidades atualizadas")}.`)).toBeVisible();
	await shot("c4-saved");
	const withRoom = (await query("SELECT count(*)::int AS n FROM location l JOIN typology t ON t.id = l.typology_id JOIN room r ON r.location_id = l.id WHERE t.project_id = $1 AND t.name = 'Tipologia A' AND r.name = 'Despensa' AND r.typology_room_id IS NOT NULL", [jardins]))[0].n;
	expect(withRoom).toBe(unitsA);

	await menu("Duplex", "Renomear");
	await expect(page.getByRole("dialog", { name: "Renomear a tipologia" })).toBeVisible();
	await expect(page.getByText("O nome novo vale em todos os locais da tipologia.")).toBeVisible();
	await shot("rename-open");
	await page.getByRole("textbox", { name: "Nome" }).fill("tipologÍa a");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Esse nome já existe nesta obra.")).toBeVisible();
	await shot("rename-taken");
	await page.getByRole("textbox", { name: "Nome" }).fill("Duplex Cobertura");
	await page.keyboard.press("Enter");
	await expect(tipologias.getByText("Duplex Cobertura")).toBeVisible();

	await tipologias.getByRole("button", { name: "Nova tipologia de área comum" }).click();
	await expect(page.getByRole("dialog", { name: "Nova tipologia de área comum" }).getByText("Ex.: Hall, Corredor, Garagem.")).toBeVisible();
	await page.getByRole("textbox", { name: "Nome" }).fill("Depósito");
	await shot("create-common-area-open");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("textbox", { name: "Novo cômodo" })).toBeFocused();
	await expect(areas.getByText("4 tipologias")).toBeVisible();
	await page.getByRole("textbox", { name: "Novo cômodo" }).fill("Prateleiras");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Nenhuma área comum usa a Depósito ainda.")).toBeVisible();
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText("Depósito salva.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Ações da Depósito" })).toBeFocused();
	await expect(areas.getByRole("button", { name: /^Depósito/ }).getByText("Sem uso")).toBeVisible();
	await expect(areas.getByText("1 cômodo ·", { exact: true })).toHaveCount(2);
	const deposito = (await query("SELECT location_type FROM typology WHERE project_id = $1 AND name = 'Depósito'", [jardins]))[0];
	expect(deposito.location_type).toBe("common_area");
	await shot("common-area-created");
	await menu("Depósito", "Excluir tipologia");
	await expect(page.getByText("Depósito excluída.")).toBeVisible();
	await expect(areas.getByText("3 tipologias")).toBeVisible();

	await tipologias.getByRole("button", { name: "Nova tipologia", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Nova tipologia" }).getByText("Ex.: Tipologia D, Garden.")).toBeVisible();
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

	await menu("Tipologia A", "Editar cômodos");
	await page.getByRole("button", { name: "Tirar Despensa" }).click();
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText(`Tipologia A salva. ${plural(unitsA, "unidade atualizada", "unidades atualizadas")}.`)).toBeVisible();
	await menu("Duplex Cobertura", "Renomear");
	await page.getByRole("textbox", { name: "Nome" }).fill("Duplex");
	await page.keyboard.press("Enter");
	await expect(tipologias.getByText("Duplex", { exact: true })).toBeVisible();

	await page.goto(`/projects/${await projectId("Galpão Logístico Sul")}/configuration`);
	await expect(section("Estrutura").getByText("A obra ainda não tem estrutura.")).toBeVisible();
	await expect(section("Estrutura").getByRole("link", { name: "Montar estrutura" })).toBeVisible();
	await expect(section("Tipologias").getByText("Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.")).toBeVisible();
	await expect(section("Tipologias").getByText("0 tipologias")).toHaveCount(2);
	await expect(section("Tipologias").getByText("Nenhuma tipologia de unidade.")).toBeVisible();
	await expect(section("Tipologias").getByText("Nenhuma tipologia de área comum.")).toBeVisible();
	await expect(section("Tipologias").getByRole("button", { name: "Nova tipologia", exact: true })).toBeVisible();
	await expect(section("Tipologias").getByRole("button", { name: "Nova tipologia de área comum" })).toBeVisible();
	await expect(section("Tipologias").getByRole("textbox", { name: "Buscar tipologia" })).toHaveCount(0);
	await shot("c8-no-typologies");

	await page.goto(`/projects/${await projectId("Residencial Vila Nova")}/configuration`);
	await expect(section("Estrutura").getByRole("link", { name: "Abrir estrutura" })).toBeVisible();
	await expect(section("Estrutura").getByRole("link", { name: "Assistente" })).toHaveCount(0);
	await expect(section("Estrutura").getByRole("button", { name: "Assistente" })).toHaveCount(0);
	await expect(section("Estrutura").getByText(locked)).toBeVisible();
	await expect(section("Tipologias").getByText("A obra foi entregue: as tipologias não podem mais ser alteradas.")).toBeVisible();
	await expect(section("Tipologias").getByRole("button", { name: /^Ações da / })).toHaveCount(0);
	await expect(section("Tipologias").getByRole("button", { name: /^Nova tipologia/ })).toHaveCount(0);
	await section("Tipologias").getByRole("button", { name: /^Tipologia A/ }).click();
	await expect(section("Tipologias").getByRole("listitem").filter({ hasText: /^Sacada$/ })).toBeVisible();
	await shot("c9-delivered");

	await page.goto(`/projects/${await projectId("Condomínio Bela Vista")}/configuration`);
	await expect(section("Estrutura").getByRole("link", { name: "Montar estrutura" })).toHaveCount(0);
	await expect(section("Estrutura").getByText(locked)).toBeVisible();
	await shot("c6-delivered-no-structure");
}
