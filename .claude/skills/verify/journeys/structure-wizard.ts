export default async function structureWizard({ page, shot, expect, query }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const email = session?.user.email;
	const phone = (page.viewportSize()?.width ?? 1280) < 768;
	const continueTo = async (step) => {
		if (phone) await page.getByRole("button", { name: `Continuar · ${step}` }).click();
	};
	const backTo = async (steps) => {
		if (phone) for (let back = 0; back < steps; back++) await page.getByRole("button", { name: "Voltar" }).click();
	};
	const endOfStep = async (name) => {
		if (!phone) return;
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await shot(`${name}-end`, { screenOnly: true });
	};
	const field = (name, at = 0) => page.getByRole("textbox", { name, exact: true }).nth(at);
	const range = (n) => page.getByRole("region", { name: `Faixa ${n}` });
	const projectId = async (name, org) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = $2", [name, org]))[0].id;

	if (email === "igor@vertice.test") {
		const jardins = await projectId("Residencial Jardins", "Vértice Engenharia");
		await page.goto(`/projects/${jardins}/structure/new`);
		await expect(page).toHaveURL(`/projects/${jardins}`);
		const ipe = await projectId("Torre Ipê", "Vértice Engenharia");
		await page.goto(`/projects/${ipe}/structure/new`);
		await expect(page.getByRole("heading", { level: 1, name: "Montar estrutura" })).toBeVisible();
		await field("Primeiro andar").fill("1");
		await field("Último andar").fill("31");
		await field("Finais").fill("01, 04");
		await continueTo("Áreas comuns");
		await continueTo("Tipologias");
		await continueTo("Prévia");
		await expect(page.getByText("Faltam 5 unidades na reserva")).toBeVisible();
		await expect(page.getByText(/^Esta estrutura usa\s125 e a obra ainda tem\s120\./)).toBeVisible();
		await expect(page.getByRole("button", { name: "Alterar reserva" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Criar estrutura" })).toBeDisabled();
		await shot("w10b-reserve-over-admin");
		await endOfStep("w10b-reserve-over-admin");
		return;
	}

	const name = phone ? "Galpão Logístico Sul" : "Villa Toscana";
	const reserve = phone ? 20 : 40;
	const target = await projectId(name, "Construtora Horizonte");
	await page.goto(`/projects/${target}`);
	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await expect(page).toHaveURL(`/projects/${target}/structure/new`);
	await expect(page.getByText(`${name} · nada é salvo antes de criar`)).toBeVisible();
	await expect(page.getByRole("checkbox", { name: "Hall em cada andar" })).not.toBeChecked();
	await expect(page.getByText("Total: 0 unidades em 0 andares")).toBeVisible();
	await shot("w1-open");
	await endOfStep("w1-open");

	await page.getByRole("button", { name: phone ? "Continuar · Áreas comuns" : "Criar estrutura" }).click();
	await expect(page.getByText("Informe os finais desta faixa.")).toBeVisible();
	await expect(field("Primeiro andar")).toBeFocused();
	await shot("w5-validation");

	await field("Primeiro andar").fill("2");
	await field("Último andar").fill("10");
	await field("Finais").fill("01, 02");
	await page.getByRole("button", { name: "Faixa", exact: true }).click();
	await expect(field("Primeiro andar", 1)).toHaveValue("11");
	await field("Último andar", 1).fill("17");
	await field("Finais", 1).fill("01");
	await expect(range(1).getByText("18 unidades · 9 andares · finais 01 e 02")).toBeVisible();
	await expect(range(2).getByText("7 unidades · 7 andares · final 01")).toBeVisible();
	await expect(page.getByText("Total: 25 unidades em 16 andares")).toBeVisible();
	await shot("w2-ranges");

	await page.getByRole("radio", { name: "1A, 1B" }).click();
	await expect(field("Finais")).toHaveValue("A, B");
	await shot("w2b-letters");
	await page.getByRole("radio", { name: "101, 102" }).click();
	await expect(field("Finais")).toHaveValue("01, 02");

	await field("Primeiro andar", 1).fill("10");
	await expect(range(2).getByText("O 10º andar já está na faixa 1. Cada andar fica numa faixa só.")).toBeVisible();
	await expect(page.getByText("Total: 0 unidades em 0 andares")).toBeVisible();
	await shot("w9-overlap");
	await field("Primeiro andar", 1).fill("11");

	await page.getByRole("checkbox", { name: "Hall em cada andar" }).click();
	await page.getByRole("button", { name: "Faixa", exact: true }).click();
	await field("Último andar", 2).fill("18");
	await range(3).getByRole("checkbox", { name: "Andares sem unidades" }).click();
	await expect(range(3).getByText("0 unidades · 1 andar")).toBeVisible();
	await expect(range(3).getByRole("textbox", { name: "Finais" })).toHaveCount(0);
	await shot("w2-no-units");
	await endOfStep("w2-no-units");

	await continueTo("Áreas comuns");
	await page.getByLabel("Área comum da obra").fill("Guarita");
	await page.getByLabel("Área comum da obra").press("Enter");
	await expect(page.getByRole("button", { name: "Tirar Guarita" })).toBeVisible();
	await shot("w2-areas");
	await endOfStep("w2-areas");
	await continueTo("Tipologias");
	await page.getByLabel("Novo cômodo da Tipologia A").fill("Sala");
	await page.getByLabel("Novo cômodo da Tipologia A").press("Enter");
	await expect(page.getByRole("button", { name: "Tirar Sala da Tipologia A" })).toBeVisible();
	await page.getByLabel("Novo cômodo da Tipologia A").fill("Sála");
	await page.getByLabel("Novo cômodo da Tipologia A").press("Enter");
	await expect(page.getByText("Esse cômodo já está na tipologia.")).toBeVisible();
	await shot("w3-typologies");
	await endOfStep("w3-typologies");
	await continueTo("Prévia");
	await expect(page.getByText(`Faltam ${44 - reserve} unidades na reserva`)).toBeVisible();
	await expect(page.getByText(`Esta estrutura usa 44 de ${reserve} reservadas.`)).toBeVisible();
	await expect(page.getByText("25 unidades + 17 halls de andar + 1 hall de entrada + 1 outra área comum")).toBeVisible();
	await expect(page.getByRole("button", { name: "Alterar reserva" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Criar estrutura" })).toBeDisabled();
	await shot("w10b-over");
	await endOfStep("w10b-over");

	await backTo(3);
	await page.getByRole("checkbox", { name: "Hall em cada andar" }).click();
	await page.getByRole("button", { name: "Tirar a faixa 2" }).click();
	await expect(page.getByText("Total: 18 unidades em 10 andares")).toBeVisible();
	await continueTo("Áreas comuns");
	await continueTo("Tipologias");
	await continueTo("Prévia");
	await expect(page.getByText("1 torre · 11 andares · 18 unidades")).toBeVisible();
	await expect(page.getByText(new RegExp(`^Esta estrutura usa\\s20 de ${reserve} reservadas\\. Depois de criar, sobram\\s${reserve - 20}\\.$`))).toBeVisible();
	await expect(page.getByText("18 unidades + 1 hall de entrada + 1 outra área comum")).toBeVisible();
	await expect(page.getByText("Torre única")).toBeVisible();
	await shot("w4-preview");
	await endOfStep("w4-preview");
	await page.getByRole("button", { name: "Criar estrutura" }).click();

	await expect(page).toHaveURL(`/projects/${target}`);
	await expect(page.getByText("Estrutura criada: 1 torre e 18 unidades.")).toBeVisible();
	await expect(page.getByRole("heading", { level: 2, name: "Fachada" })).toBeVisible();
	await expect(page.getByRole("list", { name: "Fachada" }).getByRole("listitem")).toHaveCount(11);
	await shot("w10-created");
	expect(Number((await query("SELECT count(*)::int AS n FROM location WHERE project_id = $1 AND type = 'unit'", [target]))[0].n)).toBe(18);
	expect(Number((await query("SELECT count(*)::int AS n FROM location WHERE project_id = $1 AND type = 'floor' AND name = '18º andar'", [target]))[0].n)).toBe(1);

	const bela = await projectId("Condomínio Bela Vista", "Construtora Horizonte");
	await page.goto(`/projects/${bela}/structure/new`);
	await expect(page.getByText("A obra foi entregue: a estrutura não pode mais ser alterada.")).toBeVisible();
	await expect(page.getByRole("heading", { level: 2, name: "A obra foi entregue" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Voltar para a obra" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Criar estrutura" })).toHaveCount(0);
	await shot("w15-delivered");
}
