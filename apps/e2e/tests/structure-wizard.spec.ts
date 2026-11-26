import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});
test.describe.configure({ retries: 0 });

async function signUp(page: Page) {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Bruno Teste");
	await page.getByLabel("E-mail").fill(`wizard-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");
}

async function createProject(page: Page, name: string, units: string) {
	await page.goto("/projects/new");
	await page.getByLabel("Nome da obra").fill(name);
	await page.getByLabel("Unidades reservadas").fill(units);
	await page.getByRole("button", { name: "Criar obra" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	await page.getByRole("link", { name: "Início da obra" }).click();
	await expect(
		page.getByRole("heading", { name: "A obra ainda não tem estrutura" }),
	).toBeVisible();
}

async function describeRange(
	page: Page,
	at: number,
	range: { first?: string; last: string; finals: string },
) {
	if (range.first !== undefined) {
		await page
			.getByLabel("Primeiro andar", { exact: true })
			.nth(at)
			.fill(range.first);
	}
	await page
		.getByLabel("Último andar", { exact: true })
		.nth(at)
		.fill(range.last);
	await page.getByLabel("Finais", { exact: true }).nth(at).fill(range.finals);
}

async function continueTo(page: Page, step: string) {
	const button = page.getByRole("button", { name: `Continuar · ${step}` });
	if (await button.isVisible()) await button.click();
}

test("a draft survives reload and a second tab cannot overwrite newer changes", async ({
	page,
	context,
}) => {
	await signUp(page);
	await createProject(page, "Obra rascunho", "75");
	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await describeRange(page, 0, { first: "1", last: "4", finals: "01, 02" });
	await page.reload();
	await expect(page.getByText("Rascunho restaurado")).toBeVisible();
	await expect(page.getByLabel("Último andar", { exact: true })).toHaveValue(
		"4",
	);
	const other = await context.newPage();
	await other.goto(page.url());
	await expect(other.getByText("Rascunho restaurado")).toBeVisible();
	await other.getByLabel("Último andar", { exact: true }).fill("6");
	await expect(
		page.getByText("Este rascunho mudou em outra aba"),
	).toBeVisible();
	await expect(page.getByLabel("Último andar", { exact: true })).toBeDisabled();
	await page
		.getByRole("button", { name: "Carregar a versão mais recente" })
		.click();
	await expect(page.getByLabel("Último andar", { exact: true })).toHaveValue(
		"6",
	);
	await other.close();
});

test("a new account reserves units for a project, builds its structure with the wizard and sees the façade", async ({
	page,
}) => {
	await signUp(page);
	await createProject(page, "Casa Moinhos", "75");

	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/structure\/new$/);
	await expect(
		page.getByRole("heading", { level: 1, name: "Montar estrutura" }),
	).toBeVisible();

	await describeRange(page, 0, { first: "1", last: "2", finals: "01, 04" });
	await page.getByRole("button", { name: "Faixa", exact: true }).click();
	await expect(
		page.getByLabel("Primeiro andar", { exact: true }).nth(1),
	).toHaveValue("3");
	await describeRange(page, 1, { last: "3", finals: "1 4" });
	await expect(page.getByText("Total: 12 unidades em 3 andares")).toBeVisible();
	await continueTo(page, "Áreas comuns");
	await page.getByLabel("Área comum da obra").fill("Guarita");
	await page.getByLabel("Área comum da obra").press("Enter");
	await expect(
		page.getByRole("button", { name: "Tirar Guarita" }),
	).toBeVisible();
	await continueTo(page, "Tipologias");
	await page.getByLabel("Novo cômodo").fill("Sala");
	await page.getByLabel("Novo cômodo").press("Enter");
	await expect(page.getByRole("button", { name: "Tirar Sala" })).toBeVisible();
	await continueTo(page, "Prévia");

	await expect(
		page.getByText("1 torre · 4 andares · 12 unidades"),
	).toBeVisible();
	await expect(
		page.getByText("2 áreas comuns · Tipologia A: 12"),
	).toBeVisible();
	await expect(
		page.getByText(
			/^Esta estrutura usa\s14 de 75 reservadas\. Depois de criar, sobram\s61\.$/,
		),
	).toBeVisible();
	await expect(
		page.getByText("12 unidades + 1 hall de entrada + 1 outra área comum"),
	).toBeVisible();

	await page.getByRole("button", { name: "Criar estrutura" }).click();

	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
	await expect(
		page.getByText("Estrutura criada: 1 torre e 12 unidades."),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { level: 2, name: "Fachada" }),
	).toBeVisible();
	const facade = page.getByRole("list", { name: "Fachada" });
	await expect(facade.getByRole("listitem")).toHaveCount(4);
	await expect(facade.getByRole("link", { name: "Unidade 304" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Guarita" })).toBeVisible();
	await expect(page.getByText("Torre A")).toHaveCount(0);

	await facade.getByRole("link", { name: "Unidade 304" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "304" }),
	).toBeVisible();
	await expect(page.getByText("Tipologia A").first()).toBeVisible();
	await expect(page.getByText("Sala", { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Adicionar cômodo" }).click();
	await page.getByLabel("Adicionar cômodo").fill("Lavanderia");
	await page.getByLabel("Adicionar cômodo").press("Enter");

	const rooms = page.getByRole("list", { name: "Cômodos" });
	await expect(rooms.getByText("Lavanderia")).toBeVisible();
	await expect(rooms.getByText("Só desta unidade")).toBeVisible();
	await expect(page.getByText("1 alteração")).toBeVisible();

	await page.getByRole("link", { name: "Casa Moinhos" }).click();
	await page
		.getByRole("list", { name: "Fachada" })
		.getByRole("link", { name: "3º andar" })
		.click();
	await expect(
		page.getByRole("heading", { level: 1, name: "3º andar" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Ações da unidade 304" }).click();
	await page.getByRole("menuitem", { name: "Remover unidade" }).click();

	await expect(page.getByText("Unidade 304 excluída.")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Ações da unidade 304" }),
	).toHaveCount(0);

	await page.getByRole("button", { name: "Desfazer" }).click();

	await expect(
		page.getByRole("button", { name: "Ações da unidade 304" }),
	).toBeVisible();
	await page.getByRole("link", { name: /^304/ }).click();
	await expect(
		page.getByRole("list", { name: "Cômodos" }).getByText("Lavanderia"),
	).toBeVisible();
	await expect(page.getByText("1 alteração")).toBeVisible();
});

test("a project whose reservation is smaller than the plan cannot be sent", async ({
	page,
}) => {
	await signUp(page);
	await createProject(page, "Casa Menor", "5");

	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await describeRange(page, 0, { first: "1", last: "3", finals: "01, 04" });
	await continueTo(page, "Áreas comuns");
	await continueTo(page, "Tipologias");
	await continueTo(page, "Prévia");

	await expect(page.getByText("Faltam 8 unidades na reserva")).toBeVisible();
	await expect(
		page.getByText(/Esta estrutura usa\s13 e a obra ainda tem\s5\./),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Alterar reserva" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Criar estrutura" }),
	).toBeDisabled();
});
