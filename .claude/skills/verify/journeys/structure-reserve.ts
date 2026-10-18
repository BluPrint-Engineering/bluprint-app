export default async function structureReserve({ page, shot, expect, query }) {
	const row = (
		await query(
			"SELECT p.id AS project, l.id AS floor FROM location l JOIN project p ON p.id = l.project_id JOIN organization o ON o.id = p.organization_id WHERE o.name = 'Vértice Engenharia' AND p.name = 'Residencial Jardins' AND l.type = 'floor' AND l.name = '1º andar'",
		)
	)[0];

	await page.goto(`/projects/${row.project}/locations/${row.floor}`);
	const add = page.getByRole("button", { name: "Adicionar unidade" });
	await expect(add).toBeDisabled();
	await expect(add).toHaveAccessibleDescription("A reserva da obra acabou. Alterar reserva");
	await expect(page.getByRole("button", { name: "Adicionar área comum" })).toBeEnabled();
	await shot("f5b-reserve-over-admin");

	await page.getByRole("button", { name: "Alterar reserva" }).click();
	await expect(page.getByRole("dialog", { name: "Alterar reserva" })).toBeVisible();
	await shot("f5b-alter-reserve");

	await page.goto(`/projects/${row.project}`);
	await page.getByRole("link", { name: "Adicionar andares" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Adicionar andares" })).toBeVisible();
	await page.getByRole("textbox", { name: "Último andar" }).fill("4");
	const phone = page.viewportSize().width < 768;
	if (phone) {
		await page.getByRole("button", { name: "Continuar · Áreas comuns" }).click();
		await page.getByRole("button", { name: "Continuar · Tipologias" }).click();
		await page.getByRole("button", { name: "Continuar · Prévia" }).click();
	}
	await expect(page.getByText("Esta estrutura tem 2 unidades e a reserva da obra acabou. Aumente a reserva.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Adicionar 1 andar" })).toBeDisabled();
	await shot("w9b-add-floors-over-reserve");
}
