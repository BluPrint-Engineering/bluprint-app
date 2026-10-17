export default async function units({ page, shot, expect, query, accounts }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const email = session.user.email;
	const reservationsApi = "/api/organization/units/reservations";
	const save = page.getByRole("button", { name: "Salvar" });
	const discard = page.getByRole("button", { name: "Descartar" });
	const field = (name) => page.getByRole("textbox", { name: `Reserva de ${name}` });
	const fmt = (n) => n.toLocaleString("pt-BR");

	if (email !== accounts.ADMIN_EMAIL) {
		await page.goto("/units");
		await expect(page).toHaveURL(/\/projects$/);
		await expect(page.getByRole("heading", { name: "Unidades" })).toHaveCount(0);
		const denied = await page.request.get(reservationsApi);
		expect(denied.status()).toBe(403);
		await shot("redirected-to-list");
		return;
	}

	const totals = await (await page.request.get("/api/organization/units")).json();
	await page.goto("/projects");
	await page.getByRole("link", { name: `${fmt(totals.free)} unidades livres` }).click();
	await expect(page).toHaveURL(/\/units$/);
	await expect(page.getByRole("heading", { level: 1, name: "Unidades" })).toBeVisible();
	await shot("from-the-list");

	const { items, delivered } = await (await page.request.get(reservationsApi)).json();
	const inFigure = (label, value) =>
		expect(page.getByRole("region", { name: "Unidades da construtora" }).locator("[data-slot=card]", { hasText: label })).toContainText(fmt(value));
	await expect(field(items[0].name)).toHaveValue(String(items[0].reserved));
	await inFigure("Contratadas", totals.contracted);
	await inFigure("Reservadas", totals.reserved);
	await inFigure("Livres", totals.free);
	await expect(page.getByText(/obras? entregues? usou|usaram/)).toBeVisible();
	await expect(save).toHaveCount(0);
	const reservedRows = items.reduce((sum, row) => sum + row.reserved, 0);
	expect(reservedRows + delivered.used).toBe(totals.reserved);
	await shot("ready");

	const lender = items.reduce((best, row) => (row.reserved - row.used > best.reserved - best.used ? row : best));
	const borrower = items.find((row) => row.projectId !== lender.projectId);
	const moved = Math.min(10, lender.reserved - lender.used);
	expect(moved).toBeGreaterThan(0);

	await field(lender.name).fill(String(lender.reserved - moved));
	await field(borrower.name).fill(String(borrower.reserved + moved));
	await expect(page.getByText("2 reservas alteradas")).toBeVisible();
	await inFigure("Reservadas", totals.reserved);
	await inFigure("Livres", totals.free);
	await expect(page.getByText(`Antes: ${fmt(lender.reserved)}`).first()).toBeVisible();
	await shot("editing");

	const withUsed = items.find((row) => row.used > 0);
	await discard.click();
	await field(withUsed.name).fill(String(withUsed.used - 1));
	await field(withUsed.name).blur();
	await expect(page.getByText(/A obra já usa .* A reserva não pode ficar abaixo disso\./)).toBeVisible();
	await expect(save).toBeDisabled();
	await shot("below-used");

	await discard.click();
	await expect(page.getByText(/reserva.? alterada/)).toHaveCount(0);
	await field(borrower.name).fill(String(borrower.reserved + totals.free + 1));
	await expect(page.getByText(/As reservas passam das unidades contratadas em 1\./)).toBeVisible();
	await expect(save).toBeDisabled();
	await shot("over-contracted");

	await discard.click();
	await field(lender.name).fill(String(lender.reserved - moved));
	await field(borrower.name).fill(String(borrower.reserved + moved));
	await save.click();
	await expect(page.getByText("Reservas salvas.")).toBeVisible();
	await expect(save).toHaveCount(0);
	await expect(field(lender.name)).toHaveValue(String(lender.reserved - moved));
	await expect(field(borrower.name)).toHaveValue(String(borrower.reserved + moved));
	await shot("saved");

	const rows = await query("SELECT id, reserved_units FROM project WHERE id = ANY($1) ORDER BY id", [[lender.projectId, borrower.projectId]]);
	const byId = Object.fromEntries(rows.map((row) => [row.id, row.reserved_units]));
	expect(byId[lender.projectId]).toBe(lender.reserved - moved);
	expect(byId[borrower.projectId]).toBe(borrower.reserved + moved);
	const after = await (await page.request.get("/api/organization/units")).json();
	expect(after.free).toBe(totals.free);
}
