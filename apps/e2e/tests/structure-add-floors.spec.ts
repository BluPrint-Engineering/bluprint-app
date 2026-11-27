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
	await page.getByLabel("E-mail").fill(`floors-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");
}

async function createProject(page: Page) {
	await page.goto("/projects/new");
	await page.getByLabel("Nome da obra").fill("Casa das Faixas");
	await page.getByLabel("Unidades reservadas").fill("40");
	await page.getByRole("button", { name: "Criar obra" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	const projectId = page.url().match(/projects\/([0-9a-f-]{36})/)?.[1];
	if (!projectId) throw new Error("no project id");
	return projectId;
}

function location(
	parentId: string | null,
	type: "tower" | "floor" | "unit",
	name: string,
	position: number,
) {
	return { id: randomUUID(), parentId, type, name, position };
}

test("added floors land between the ones the tower has, read from the façade", async ({
	page,
}) => {
	await signUp(page);
	const projectId = await createProject(page);
	const tower = location(null, "tower", "Torre A", 0);
	const floors = [
		location(tower.id, "floor", "Térreo", 0),
		...[2, 3, 4, 5, 6, 7].map((number, index) =>
			location(tower.id, "floor", `${number}º andar`, index + 1),
		),
		location(tower.id, "floor", "9º andar", 7),
		location(tower.id, "floor", "10º andar", 8),
		location(tower.id, "floor", "Cobertura", 9),
	];
	const units = floors.flatMap((floor) =>
		floor.name.endsWith("andar") && floor.name !== "Térreo"
			? [
					location(
						floor.id,
						"unit",
						`${floor.name.replace("º andar", "")}01`,
						0,
					),
				]
			: [],
	);
	const created = await page.request.post(
		`/api/projects/${projectId}/structure`,
		{
			data: { locations: [tower, ...floors, ...units] },
		},
	);
	expect(created.ok()).toBeTruthy();

	await page.goto(`/projects/${projectId}/structure/new?tower=${tower.id}`);
	await expect(
		page.getByRole("heading", { level: 1, name: "Adicionar andares" }),
	).toBeVisible();
	await page.getByLabel("Do andar", { exact: true }).fill("8");
	await page.getByLabel("Último andar", { exact: true }).fill("8");
	await page.getByLabel("Finais", { exact: true }).fill("01");
	await page.getByRole("button", { name: "Faixa", exact: true }).click();
	await page.getByLabel("Do andar", { exact: true }).nth(1).fill("1");
	await page.getByLabel("Último andar", { exact: true }).nth(1).fill("1");
	await page.getByLabel("Finais", { exact: true }).nth(1).fill("01");

	const preview = page.getByRole("button", { name: "Continuar · Tipologias" });
	if (await preview.isVisible()) {
		await preview.click();
		await page.getByRole("button", { name: "Continuar · Prévia" }).click();
	}
	await page.getByRole("button", { name: "Adicionar 2 andares" }).click();
	await expect(page.getByText("2 andares adicionados.")).toBeVisible();

	const facade = page.getByRole("list", { name: "Fachada" });
	const topToBottom = await facade
		.getByRole("link")
		.evaluateAll((links) =>
			links
				.map((link) => link.getAttribute("aria-label"))
				.filter(
					(name): name is string =>
						name === "Térreo" ||
						name === "Cobertura" ||
						(name?.endsWith("andar") ?? false),
				),
		);
	expect([...topToBottom].reverse()).toEqual([
		"Térreo",
		"1º andar",
		"2º andar",
		"3º andar",
		"4º andar",
		"5º andar",
		"6º andar",
		"7º andar",
		"8º andar",
		"9º andar",
		"10º andar",
		"Cobertura",
	]);
});
