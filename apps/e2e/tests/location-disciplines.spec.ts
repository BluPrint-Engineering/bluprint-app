import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});
test.describe.configure({ retries: 0 });

interface Site {
	projectId: string;
	floor: string;
	units: Record<"201" | "202" | "203", string>;
}

async function signUp(page: Page) {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Bruno Teste");
	await page.getByLabel("E-mail").fill(`lote-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");
}

async function createSite(page: Page): Promise<Site> {
	const projectId = randomUUID();
	const created = await page.request.post("/api/projects", {
		data: { id: projectId, name: "Casa Moinhos", units: 20 },
	});
	expect(created.ok()).toBe(true);

	const tower = randomUUID();
	const floor = randomUUID();
	const units = {
		"201": randomUUID(),
		"202": randomUUID(),
		"203": randomUUID(),
	};
	const structure = await page.request.post(
		`/api/projects/${projectId}/structure`,
		{
			data: {
				locations: [
					{
						id: tower,
						parentId: null,
						type: "tower",
						name: "Torre A",
						position: 0,
					},
					{
						id: floor,
						parentId: tower,
						type: "floor",
						name: "2º andar",
						position: 0,
					},
					...Object.entries(units).map(([name, id], position) => ({
						id,
						parentId: floor,
						type: "unit",
						name,
						position,
					})),
					{
						id: randomUUID(),
						parentId: floor,
						type: "common_area",
						name: "Hall do 2º andar",
						position: 3,
					},
				],
			},
		},
	);
	expect(structure.ok()).toBe(true);
	return { projectId, floor, units };
}

const location = (site: Site, locationId: string) =>
	`/projects/${site.projectId}/locations/${locationId}`;

const box = (page: Page, name: string) =>
	page.getByRole("checkbox", { name, exact: true });

test("creates a discipline for the whole project, turns it off at a unit, applies a batch to the floor and finds the unit and the floor as expected", async ({
	page,
}) => {
	await signUp(page);
	const site = await createSite(page);

	await page.goto(location(site, site.units["201"]));
	await page.getByRole("button", { name: "Nova disciplina" }).click();
	const creating = page.getByRole("dialog", { name: "Nova disciplina" });
	await creating.getByRole("textbox", { name: "Nome" }).fill("Gesso");
	await creating.getByRole("radio", { name: "Na obra toda" }).click();
	await creating.getByRole("button", { name: "Criar" }).click();
	await expect(page.getByText("Disciplina Gesso criada.")).toBeVisible();
	await expect(box(page, "Gesso")).toBeChecked();

	await box(page, "Gesso").click();
	await expect(box(page, "Gesso")).not.toBeChecked();
	await expect(page.getByText("2 de 3", { exact: true })).toBeVisible();

	await page.goto(location(site, site.floor));
	await expect(
		page.getByRole("heading", { level: 1, name: "2º andar" }),
	).toBeVisible();
	const opener = page.getByRole("button", {
		name: "Aplicar às unidades e áreas comuns",
	});
	await expect(opener).toBeEnabled();
	await opener.click();

	const batch = page.getByRole("dialog", { name: "Disciplinas em lote" });
	await expect(batch.getByRole("radio", { name: "Um andar" })).toBeChecked();
	await expect(batch.getByRole("combobox", { name: "Andar" })).toHaveValue(
		site.floor,
	);
	const apply = batch.getByRole("button", { name: "Aplicar a 4 locais" });
	await expect(apply).toBeEnabled();
	await batch.getByRole("checkbox", { name: "Hidráulica" }).click();
	await apply.click();

	await expect(
		page.getByText("Disciplinas aplicadas a 4 locais."),
	).toBeVisible();
	await expect(batch).toBeHidden();
	await expect(opener).toBeFocused();
	await expect(box(page, "Hidráulica")).toBeChecked();
	await expect(box(page, "Elétrica")).toBeChecked();
	await expect(box(page, "Gesso")).not.toBeChecked();

	await page.goto(location(site, site.units["201"]));
	await expect(box(page, "Hidráulica")).not.toBeChecked();
	await expect(box(page, "Elétrica")).toBeChecked();
	await expect(box(page, "Gesso")).toBeChecked();

	await page.goto(location(site, site.units["203"]));
	await expect(box(page, "Hidráulica")).not.toBeChecked();
	await expect(box(page, "Elétrica")).toBeChecked();
	await expect(box(page, "Gesso")).toBeChecked();
});

test("creates a discipline from inside the batch and comes back with the target and the boxes preserved", async ({
	page,
}) => {
	await signUp(page);
	const site = await createSite(page);

	await page.goto(location(site, site.units["201"]));
	const opener = page.getByRole("button", { name: "Aplicar a outros locais" });
	await expect(opener).toBeEnabled();
	await opener.click();
	const batch = page.getByRole("dialog", { name: "Disciplinas em lote" });
	await batch.getByRole("checkbox", { name: "202", exact: true }).click();
	await batch.getByRole("checkbox", { name: "Hidráulica" }).click();

	const newButton = batch.getByRole("button", { name: "Nova disciplina" });
	await newButton.click();
	const creating = page.getByRole("dialog", { name: "Nova disciplina" });
	await creating.getByRole("button", { name: "Cancelar" }).click();
	await expect(creating).toBeHidden();
	await expect(newButton).toBeFocused();
	await expect(batch.getByRole("checkbox", { name: "202" })).toBeChecked();

	await newButton.click();
	await creating.getByRole("textbox", { name: "Nome" }).fill("Gesso");
	await creating.getByRole("radio", { name: "Só onde for ligada" }).click();
	await creating.getByRole("button", { name: "Criar" }).click();

	await expect(page.getByText("Disciplina Gesso criada.")).toBeVisible();
	await expect(creating).toBeHidden();
	await expect(batch.getByRole("checkbox", { name: "Gesso" })).toBeChecked();
	await expect(
		batch.getByRole("checkbox", { name: "Hidráulica" }),
	).not.toBeChecked();
	await expect(batch.getByRole("checkbox", { name: "201" })).toBeChecked();
	await expect(batch.getByRole("checkbox", { name: "202" })).toBeChecked();
	await expect(
		batch.getByRole("button", { name: "Aplicar a 2 locais" }),
	).toBeEnabled();
	await expect(newButton).toBeFocused();

	await page.keyboard.press("Escape");
	await expect(batch).toBeHidden();
	await expect(opener).toBeFocused();
});
