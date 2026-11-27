export default async function structureDraft({ page, context, shot, expect, query }) {
	const phone = page.viewportSize().width < 768;
	const projectId = async (name) => (await query("SELECT p.id FROM project p JOIN organization o ON o.id = p.organization_id WHERE p.name = $1 AND o.name = 'Construtora Horizonte'", [name]))[0].id;
	const capture = async (name) => {
		await shot(name);
		if (phone) {
			await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
			await shot(`${name}-end`, { screenOnly: true });
		}
	};
	const preview = async () => {
		if (phone) for (const step of ["Áreas comuns", "Tipologias", "Prévia"]) await page.getByRole("button", { name: `Continuar · ${step}` }).click();
	};
	const hold = async (pattern) => {
		let release;
		const reached = new Promise((resolve) => {
			page.route(pattern, async (route) => {
				resolve();
				await new Promise((done) => { release = done; });
				await route.abort();
			}, { times: 1 });
		});
		return { reached, release: () => release() };
	};
	const id = await projectId(phone ? "Galpão Logístico Sul" : "Villa Toscana");
	await page.goto(`/projects/${id}`);
	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await page.getByLabel("Primeiro andar", { exact: true }).fill("1");
	await page.getByLabel("Último andar", { exact: true }).fill("2");
	await page.getByLabel("Finais", { exact: true }).fill("01, 02");
	await preview();
	const request = await hold(`**/api/projects/${id}/structure`);
	await page.getByRole("button", { name: "Criar estrutura" }).click();
	await request.reached;
	await expect(page.getByRole("button", { name: "Criando estrutura…" })).toBeVisible();
	await capture("w11-sending");
	request.release();
	await expect(page.getByText("Não foi possível confirmar")).toBeVisible();
	await capture("w12-uncertain");
	const check = await hold(`**/api/projects/${id}/locations/**`);
	await page.reload();
	await check.reached;
	await expect(page.getByText("Conferindo se a estrutura foi criada…")).toBeVisible();
	await capture("w13-checking");
	check.release();
	await expect(page.getByText("Não foi possível confirmar")).toBeVisible();
	await page.getByRole("button", { name: "Voltar a editar" }).click();
	await expect(page.getByLabel("Primeiro andar", { exact: true })).toBeEnabled();
	await page.reload();
	await expect(page.getByText("Rascunho restaurado")).toBeVisible();
	await capture("w14-restored");
	const other = await context.newPage();
	await other.goto(page.url());
	await other.getByLabel("Último andar", { exact: true }).fill("3");
	await expect(page.getByText("Este rascunho mudou em outra aba")).toBeVisible();
	await capture("other-tab");
	await page.getByRole("button", { name: "Carregar a versão mais recente" }).click();
	await other.close();
	await page.getByRole("button", { name: "Descartar rascunho" }).click();
	await page.getByRole("button", { name: "Descartar", exact: true }).click();
	const jardins = await projectId("Residencial Jardins");
	const tower = (await query("SELECT id FROM location WHERE project_id = $1 AND type = 'tower' AND name = 'Torre B'", [jardins]))[0].id;
	await page.goto(`/projects/${jardins}/locations/${tower}`);
	if (phone) {
		await page.getByRole("button", { name: "Ações da torre", exact: true }).click();
		await page.getByRole("menuitem", { name: "Adicionar andares" }).click();
	} else await page.getByRole("link", { name: "Adicionar andares" }).click();
	await page.getByLabel("Último andar", { exact: true }).fill("11");
	await preview();
	const add = await hold(`**/api/projects/${jardins}/structure`);
	await page.getByRole("button", { name: /Adicionar 1 andar/ }).click();
	await add.reached;
	await expect(page.getByRole("button", { name: "Adicionando andares…" })).toBeVisible();
	await capture("a6-sending");
	add.release();
	await expect(page.getByText("Não foi possível confirmar")).toBeVisible();
	await capture("a7-uncertain");
}
