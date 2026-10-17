export default async function structureWizard({ page, shot, expect, query }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const email = session?.user.email;
	const phone = (page.viewportSize()?.width ?? 1280) < 768;
	const continueTo = async (step) => {
		if (phone) await page.getByRole("button", { name: `Continuar · ${step}` }).click();
	};
	const projectId = async (name, org) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = $2", [name, org]))[0].id;

	if (email === "igor@vertice.test") {
		const jardins = await projectId("Residencial Jardins", "Vértice Engenharia");
		await page.goto(`/projects/${jardins}/structure/new`);
		await expect(page.getByRole("heading", { level: 1, name: "Montar estrutura" })).toBeVisible();
		await page.getByLabel("Último andar").fill("2");
		await page.getByLabel("Unidades por andar").fill("2");
		await continueTo("Áreas comuns");
		await continueTo("Prévia");
		await expect(page.getByText("Esta estrutura tem 4 unidades e a reserva da obra acabou. Aumente a reserva.")).toBeVisible();
		await expect(page.getByRole("link", { name: "Alterar reserva" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Criar estrutura" })).toBeDisabled();
		await shot("reserve-over-admin");
		return;
	}

	const name = phone ? "Galpão Logístico Sul" : "Villa Toscana";
	const reserve = phone ? 20 : 40;
	const target = await projectId(name, "Construtora Horizonte");
	await page.goto(`/projects/${target}`);
	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await expect(page).toHaveURL(`/projects/${target}/structure/new`);
	await expect(page.getByText(`${name} · nada é salvo antes de criar`)).toBeVisible();
	await shot("w1-open");

	await page.getByLabel("Último andar").fill("");
	await page.getByLabel("Unidades por andar").fill("4");
	await page.getByRole("button", { name: phone ? "Continuar · Áreas comuns" : "Criar estrutura" }).click();
	await expect(page.getByText("Informe o último andar.")).toBeVisible();
	await expect(page.getByLabel("Último andar")).toBeFocused();
	await shot("w5-validation");

	await page.getByLabel("Último andar").fill("12");
	await continueTo("Áreas comuns");
	await page.getByLabel("Área comum da obra").fill("Guarita");
	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await expect(page.getByRole("button", { name: "Tirar Guarita" })).toBeVisible();
	await shot("w2-areas");
	await continueTo("Prévia");
	await expect(page.getByText(`Esta estrutura tem 48 unidades e a obra tem ${reserve}.`)).toBeVisible();
	await expect(page.getByRole("button", { name: "Criar estrutura" })).toBeDisabled();
	await shot("w4c-over");

	if (phone) await page.getByRole("button", { name: "Voltar" }).click();
	if (phone) await page.getByRole("button", { name: "Voltar" }).click();
	await page.getByLabel("Último andar").fill("3");
	await continueTo("Áreas comuns");
	await continueTo("Prévia");
	await expect(page.getByText("1 torre · 4 andares · 12 unidades")).toBeVisible();
	await expect(page.getByText(`Usa 12 das ${reserve} unidades que restam nesta obra. Depois de criar, sobram ${reserve - 12}.`)).toBeVisible();
	await shot("w4-preview");
	await page.getByRole("button", { name: "Criar estrutura" }).click();

	await expect(page).toHaveURL(`/projects/${target}`);
	await expect(page.getByText("Estrutura criada: 1 torre e 12 unidades.")).toBeVisible();
	await expect(page.getByRole("heading", { level: 2, name: "Fachada" })).toBeVisible();
	await expect(page.getByRole("list", { name: "Fachada" }).getByRole("listitem")).toHaveCount(4);
	await shot("w10-created");
	expect(Number((await query("SELECT count(*)::int AS n FROM location WHERE project_id = $1 AND type = 'unit'", [target]))[0].n)).toBe(12);

	const bela = await projectId("Condomínio Bela Vista", "Construtora Horizonte");
	await page.goto(`/projects/${bela}/structure/new`);
	await expect(page.getByText("A obra foi entregue: a estrutura não pode mais ser alterada.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Criar estrutura" })).toHaveCount(0);
	await shot("delivered");
}
