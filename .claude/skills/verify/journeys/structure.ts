export default async function structure({ page, shot, expect, query }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const admin = session?.user.email === "ana@horizonte.test";
	const missing = "0190b000-0000-7000-8000-999999999999";
	const clippedUnits = (facade) =>
		facade.getByRole("link", { name: /^Unidade / }).evaluateAll((links) =>
			links.filter((link) => link.firstElementChild.scrollWidth > link.firstElementChild.clientWidth).map((link) => link.textContent),
		);
	const delivered = "A obra foi entregue: a estrutura não pode mais ser alterada.";

	const projectId = async (name) =>
		(await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const locationId = async (project, type, name) =>
		(await query("SELECT l.id FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte' AND l.type = $2 AND l.name = $3", [project, type, name]))[0].id;

	if (!admin) {
		const jardins = await projectId("Residencial Jardins");
		await page.goto(`/projects/${jardins}`);
		await expect(page.getByRole("heading", { level: 2, name: "Torres" })).toBeVisible();
		await shot("manager-towers");
		const galpao = await projectId("Galpão Logístico Sul");
		await page.goto(`/projects/${galpao}`);
		await expect(page.getByRole("heading", { level: 1, name: "Obra não encontrada" })).toBeVisible();
		return;
	}

	await page.goto(`/projects/${await projectId("Galpão Logístico Sul")}`);
	await expect(page.getByRole("heading", { name: "A obra ainda não tem estrutura" })).toBeVisible();
	await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
	await shot("home-empty");

	const jardins = await projectId("Residencial Jardins");
	await page.goto(`/projects/${jardins}`);
	await expect(page.getByRole("heading", { level: 2, name: "Torres" })).toBeVisible();
	await expect(page.getByRole("link", { name: /^Torre B/ })).toContainText("1º ao 10º");
	await expect(page.getByRole("link", { name: /^Torre A/ })).toContainText("Tipologia A, Tipologia B, Cobertura");
	await shot("home-towers");

	await page.getByRole("link", { name: /^Torre A/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre A" })).toBeVisible();
	await expect(page.getByText("Torre · 15 andares · 50 unidades")).toBeVisible();
	const facade = page.getByRole("list", { name: "Fachada da Torre A" });
	await expect(facade.getByRole("listitem").first()).toContainText("Cobertura");
	expect(await clippedUnits(facade)).toEqual([]);
	await shot("tower-facade");

	await page.getByRole("link", { name: "9º andar" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "9º andar" })).toBeVisible();
	await expect(page.getByText("Andar · Torre A · 4 unidades")).toBeVisible();
	await shot("floor-lists");

	await expect(page.getByRole("link", { name: /^902/ })).toContainText("Tipologia B · 1 alteração");
	await expect(page.getByRole("link", { name: /^903/ })).toContainText("Tipologia A · 3 alterações");

	await page.getByRole("link", { name: /^903/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: "903" })).toBeVisible();
	await expect(page.getByText("Unidade · Torre A · 9º andar")).toBeVisible();
	await expect(page.getByText("3 alterações")).toBeVisible();
	await expect(page.getByText("Só desta unidade")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Tirados desta unidade" })).toBeVisible();
	await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
	await shot("unit-changes");
	await page.getByRole("link", { name: "9º andar" }).click();
	await page.getByRole("link", { name: /^901/ }).click();
	await expect(page.getByText("Os cômodos acompanham a tipologia Tipologia A.")).toBeVisible();
	await expect(page.getByText("Só desta unidade")).toHaveCount(0);
	await shot("unit-on-type");
	await page.getByRole("link", { name: "9º andar" }).click();
	await page.getByRole("link", { name: "Torre A" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre A" })).toBeVisible();

	await page.goto(`/projects/${jardins}`);
	await page.getByRole("link", { name: /^Torre B/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();
	const facadeB = page.getByRole("list", { name: "Fachada da Torre B" });
	const backTo = (name) => page.getByRole("link", { name, exact: true });

	await facadeB.getByRole("link", { name: "Unidade 701" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "701" })).toBeVisible();
	await expect(page.getByText("Unidade · Torre B · 7º andar")).toBeVisible();
	await expect(backTo("Torre B")).toBeVisible();
	await expect(backTo("7º andar")).toHaveCount(0);
	await shot("unit-from-facade");
	await page.reload();
	await expect(backTo("Torre B")).toBeVisible();
	await backTo("Torre B").click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();
	await shot("tower-after-unit-back");

	await facadeB.getByRole("listitem").filter({ hasText: /^7º/ }).getByRole("link", { name: "Hall" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Hall" })).toBeVisible();
	await expect(backTo("Torre B")).toBeVisible();
	await backTo("Torre B").click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();

	await facadeB.getByRole("link", { name: "7º andar" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "7º andar" })).toBeVisible();
	await page.getByRole("link", { name: /^701/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: "701" })).toBeVisible();
	await expect(backTo("7º andar")).toBeVisible();
	const unitFromFloor = page.url();
	await shot("unit-from-floor");
	await backTo("7º andar").click();
	await expect(page.getByRole("heading", { level: 1, name: "7º andar" })).toBeVisible();
	await shot("floor-after-unit-back");
	await backTo("Torre B").click();
	await expect(page.getByRole("heading", { level: 1, name: "Torre B" })).toBeVisible();

	await page.goto(`${unitFromFloor}?from=${await locationId("Residencial Jardins", "tower", "Torre A")}`);
	await expect(backTo("7º andar")).toBeVisible();

	await page.goto(`/projects/${jardins}/locations/${await locationId("Residencial Jardins", "unit", "1204")}`);
	await expect(page.getByText("Os cômodos desta unidade são só dela.")).toBeVisible();
	await expect(page.getByRole("list", { name: "Cômodos" }).getByRole("listitem")).toHaveCount(3);
	await expect(page.getByText("Só desta unidade")).toHaveCount(0);
	await shot("unit-without-type");

	await page.goto(`/projects/${jardins}/locations/${await locationId("Residencial Jardins", "common_area", "Salão de festas")}`);
	await expect(page.getByRole("heading", { level: 2, name: "Cômodos" })).toBeVisible();
	await expect(page.getByRole("heading", { level: 2, name: "Tipologia" })).toHaveCount(0);
	await expect(page.getByRole("list", { name: "Cômodos" }).getByRole("listitem")).toHaveCount(2);
	await shot("common-area-rooms");

	await page.goto(`/projects/${await projectId("Edifício Aurora")}`);
	await expect(page.getByRole("heading", { level: 2, name: "Fachada" })).toBeVisible();
	await expect(page.getByText("Torre A")).toHaveCount(0);
	await shot("home-single-tower");
	await page.getByRole("list", { name: "Fachada" }).getByRole("link", { name: "Unidade 8A" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "8A" })).toBeVisible();
	await expect(backTo("Edifício Aurora")).toBeVisible();
	await shot("single-tower-unit-from-facade");
	await backTo("Edifício Aurora").click();
	await expect(page.getByRole("heading", { level: 2, name: "Fachada" })).toBeVisible();

	await page.goto(`/projects/${await projectId("Condomínio Porto Belo")}/locations/${await locationId("Condomínio Porto Belo", "tower", "Torre B")}`);
	await expect(page.getByRole("heading", { name: "A Torre B ainda não tem andares" })).toBeVisible();
	await shot("tower-no-floors");

	await page.goto(`/projects/${await projectId("Residencial Vila Nova")}`);
	await expect(page.getByText(delivered)).toBeVisible();
	await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
	await shot("home-delivered");

	await page.goto(`/projects/${await projectId("Condomínio Bela Vista")}`);
	await expect(page.getByText(delivered)).toBeVisible();
	await expect(page.getByRole("heading", { name: "A obra ainda não tem estrutura" })).toBeVisible();

	await page.goto(`/projects/${jardins}/locations/${missing}`);
	await expect(page.getByRole("heading", { name: "Local não encontrado" })).toBeVisible();
	await shot("location-not-found");
	await page.getByRole("link", { name: "Voltar para a obra" }).click();
	await expect(page).toHaveURL(`/projects/${jardins}`);

	const big = await projectId("Parque das Águas · Fase 2");
	await page.goto(`/projects/${big}`);
	await expect(page.getByRole("heading", { level: 2, name: "Torres" })).toBeVisible();
	await page.getByRole("link", { name: /^Torre B/ }).click();
	const bigFacade = page.getByRole("list", { name: "Fachada da Torre B" });
	await expect(bigFacade.getByRole("listitem")).toHaveCount(22);
	expect(await clippedUnits(bigFacade)).toEqual([]);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	await shot("big-tower");
}
