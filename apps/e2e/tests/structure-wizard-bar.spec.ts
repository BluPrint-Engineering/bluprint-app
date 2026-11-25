import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Locator, type Page, test } from "@playwright/test";

test.use({
	storageState: { cookies: [], origins: [] },
	extraHTTPHeaders: {
		"x-forwarded-for": `10.${[...randomBytes(3)].join(".")}`,
	},
});

async function openBlankWizard(page: Page) {
	await page.goto("/signup");
	await page.getByLabel("Nome completo").fill("Barra Teste");
	await page.getByLabel("E-mail").fill(`wizard-bar-${randomUUID()}@e2e.test`);
	await page.getByLabel("Senha", { exact: true }).fill("tres-lajes-e-um-prumo");
	await page
		.getByRole("checkbox", {
			name: "Aceito os termos de uso e a política de privacidade",
		})
		.click();
	await page.getByRole("button", { name: "Criar conta" }).click();
	await expect(page).toHaveURL("/projects");
	await page.goto("/projects/new");
	await page.getByLabel("Nome da obra").fill("Casa da Barra");
	await page.getByLabel("Unidades reservadas").fill("5");
	await page.getByRole("button", { name: "Criar obra" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	await page.getByRole("link", { name: "Início da obra" }).click();
	await page.getByRole("link", { name: "Montar estrutura" }).click();
	await expect(page.getByText("Passo 1 de 4")).toBeVisible();
}

async function bottomOf(locator: Locator) {
	const box = await locator.boundingBox();
	if (!box) throw new Error("not on the page");
	return box.y + box.height;
}

async function expectLastControlAboveTheBar(page: Page, step: string) {
	const section = page.getByRole("region", { name: step, exact: true });
	const controls = section
		.locator("input, button, select, textarea, a, [role=radio]")
		.filter({ visible: true });
	const last = (await controls.count()) > 0 ? controls.last() : section;
	const bar = page
		.getByRole("button", { name: /^(Continuar · .+|Criar estrutura)$/ })
		.locator("xpath=ancestor::div[contains(@class, 'fixed')][1]");
	await expect(last).toBeVisible();
	await expect
		.poll(
			async () => {
				await page.evaluate(
					"window.scrollTo(0, document.documentElement.scrollHeight)",
				);
				const top = (await bar.boundingBox())?.y ?? 0;
				return (
					(await bottomOf(last)) <= top && (await bottomOf(section)) <= top
				);
			},
			{ message: `the end of ${step} sits whole above the bottom bar` },
		)
		.toBe(true);
}

test("on a phone, scrolling to the end of each step leaves its last control whole above the bottom bar", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "the bottom bar exists only on a phone");
	await openBlankWizard(page);
	await page.getByLabel("Primeiro andar").fill("1");
	await page.getByLabel("Último andar").fill("4");
	await page.getByLabel("Finais").fill("01, 02");

	await expectLastControlAboveTheBar(page, "Torres e andares");
	for (const step of ["Áreas comuns", "Tipologias", "Prévia"]) {
		await page.getByRole("button", { name: `Continuar · ${step}` }).click();
		await expect(
			page.getByRole("heading", { level: 2, name: step }),
		).toBeVisible();
		if (step === "Prévia") {
			await expect(
				page.getByText("Faltam 4 unidades na reserva"),
			).toBeVisible();
		}
		await expectLastControlAboveTheBar(page, step);
	}
});
