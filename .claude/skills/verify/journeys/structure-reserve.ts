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
}
